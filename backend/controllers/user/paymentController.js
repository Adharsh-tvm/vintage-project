import dotenv from 'dotenv';
dotenv.config();

import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../../models/product/paymentmodel.js';
import Order from '../../models/product/orderModel.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Cart from '../../models/product/cartModel.js';
import Variant from '../../models/product/sizeVariantModel.js';
import Address from '../../models/userAddressModel.js';
import { HttpStatus } from '../../utils/httpStatus.js';

const cleanKeyId = process.env.RAZORPAY_KEY_ID?.trim();
const cleanKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

console.log("RAZORPAY_KEY_ID:", cleanKeyId);
console.log("RAZORPAY_KEY_SECRET:", cleanKeySecret ? "exists (masked)" : "missing");

const razorpay = new Razorpay({
  key_id: cleanKeyId,
  key_secret: cleanKeySecret
});

const generateOrderId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
};

// Helper function to create order
const createOrder = async (orderData, session) => {
  try {
    const { 
      userId, 
      addressId, 
      paymentMethod, 
      amount,
      couponCode,
      discountAmount,
      razorpayPaymentId 
    } = orderData;

    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.variant',
        populate: {
          path: 'product',
          select: 'name isBlocked'
        }
      })
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const variant = await Variant.findById(item.variant._id).session(session);
      
      if (!variant || variant.isBlocked || variant.product.isBlocked) {
        throw new Error(`${item.variant.product.name} is no longer available`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.variant.product.name}`);
      }

      await Variant.findByIdAndUpdate(
        variant._id,
        { $inc: { stock: -item.quantity } },
        { session }
      );

      const itemTotal = item.quantity * variant.price;
      subtotal += itemTotal;

      orderItems.push({
        product: item.variant.product._id,
        sizeVariant: item.variant._id,
        quantity: item.quantity,
        price: variant.price,
        finalPrice: itemTotal,
        status: 'pending'
      });
    }

    const shippingCost = subtotal > 500 ? 0 : 50;
    const total = subtotal + shippingCost;
    const orderId = generateOrderId();

    // Fetch the complete address first
    const address = await Address.findById(addressId);
    if (!address) {
      throw new Error('Address not found');
    }

    const order = await Order.create([{
      user: userId,
      cart: cart._id,
      items: orderItems,
      shipping: {
        address: {
          fullName: address.fullName,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          country: address.country || 'India',
          postalCode: address.postalCode
        },
        shippingMethod: "Standard",
        deliveryCharge: shippingCost
      },
      payment: {
        method: paymentMethod,
        status: 'completed',
        transactionId: razorpayPaymentId || `TXN${Date.now()}`,
        amount: amount
      },
      totalAmount: amount,
      couponCode: couponCode,
      discountAmount: discountAmount,
      orderId: orderId,
      orderStatus: 'Processing'
    }], { session });

    await Cart.findByIdAndUpdate(
      cart._id,
      { $set: { items: [] } },
      { session }
    );

    return order[0];
  } catch (error) {
    throw error;
  }
};

export const createPaymentOrder = asyncHandler(async (req, res) => {
  try {
    const { amount, addressId, paymentMethod, } = req.body;
    
    if (!amount || !addressId || !paymentMethod) {
      res.status(HttpStatus.BAD_REQUEST);
      throw new Error('Amount, address, and payment method are required');
    }

    // Create Razorpay order with the discounted amount
    const options = {
      amount: Math.round(amount * 100), // amount is already calculated with discounts
      currency: "INR",
      receipt: `tmp_${Date.now()}`
    };

    const razorpayOrder = await razorpay.orders.create(options);

    if (!razorpayOrder) {
      throw new Error('Failed to create Razorpay order');
    }

    const tempPayment = await Payment.create({
      userId: req.user._id,
      orderId: razorpayOrder.id,
      amount: amount,
      status: 'created',
      tempOrderData: {
        addressId,
        paymentMethod,
        amount,
        userId: req.user._id,
        couponCode: req.body.couponCode,
        discountAmount: req.body.discountAmount
      }
    });

    res.status(HttpStatus.OK).json({
      success: true,
      order: razorpayOrder,
      tempOrderId: tempPayment._id
    });

  } catch (error) {
    console.error("Error in createPaymentOrder:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
});

export const verifyPayment = asyncHandler(async (req, res) => {
  console.log("Request " ,req);
  
  const session = await mongoose.startSession();
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      tempOrderId,
      amount, // This is total-couponDiscount
      couponCode, 
      discountAmount 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing required payment parameters');
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", cleanKeySecret)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      throw new Error('Invalid payment signature');
    }

    await session.startTransaction();

    const tempPayment = await Payment.findById(tempOrderId);
    if (!tempPayment) {
      throw new Error('Temporary payment record not found');
    }

    // Pass coupon details to createOrder
    const orderData = {
      ...tempPayment.tempOrderData,
      razorpayPaymentId: razorpay_payment_id,
      amount: amount,
      couponCode: couponCode,
      discountAmount: discountAmount
    };

    const order = await createOrder(orderData, session);

    await Payment.findByIdAndUpdate(
      tempOrderId,
      {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'completed',
        orderId: order.orderId
      },
      { session }
    );

    await session.commitTransaction();

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Payment verified and order created successfully",
      orderId: order.orderId
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  } finally {
    await session.endSession();
  }
});

export const cancelPayment = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId } = req.body;

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    await session.startTransaction();

    const order = await Order.findOneAndUpdate(
      { orderId: orderId },
      { 
        'payment.status': 'cancelled',
        orderStatus: 'Cancelled',
        reason: 'Payment failed or cancelled'
      },
      { new: true, session }
    );

    if (!order) {
      throw new Error('Order not found');
    }

    for (const item of order.items) {
      await Variant.findByIdAndUpdate(
        item.sizeVariant,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    await Payment.create([{
      userId: req.user._id,
      orderId,
      status: 'cancelled',
      amount: order.totalAmount,
      checkoutId: order._id,
      error: 'Payment cancelled or failed'
    }], { session });

    await session.commitTransaction();

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Payment cancelled and order reversed successfully"
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  } finally {
    await session.endSession();
  }
});

export const handlePaymentFailure = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { tempOrderId, razorpayOrderId, paymentId, error } = req.body;

    if (!tempOrderId) {
      throw new Error('tempOrderId is required');
    }

    // Find the temporary payment record that was created at create-order time
    const tempPayment = await Payment.findById(tempOrderId);
    if (!tempPayment || !tempPayment.tempOrderData) {
      throw new Error('Temporary payment record not found');
    }

    await session.startTransaction();

    const { userId, addressId, paymentMethod, amount, couponCode, discountAmount } = tempPayment.tempOrderData;

    // Fetch cart to build order items
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.variant',
        populate: { path: 'product', select: 'name isBlocked' }
      })
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty or already cleared');
    }

    // Fetch address
    const address = await Address.findById(addressId);
    if (!address) throw new Error('Address not found');

    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const variant = await Variant.findById(item.variant._id).session(session);
      if (!variant) continue;
      const itemTotal = item.quantity * variant.price;
      subtotal += itemTotal;
      orderItems.push({
        product: item.variant.product._id,
        sizeVariant: item.variant._id,
        quantity: item.quantity,
        price: variant.price,
        finalPrice: itemTotal,
        status: 'Cancelled'
      });
    }

    const shippingCost = subtotal > 500 ? 0 : 50;
    const orderId = generateOrderId();

    // Create order with 'Payment Failed' status — visible in order history
    const order = await Order.create([{
      user: userId,
      cart: cart._id,
      items: orderItems,
      shipping: {
        address: {
          fullName: address.fullName,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          country: address.country || 'India',
          postalCode: address.postalCode
        },
        shippingMethod: 'Standard',
        deliveryCharge: shippingCost
      },
      payment: {
        method: paymentMethod,
        status: 'failed',
        transactionId: paymentId || razorpayOrderId || `FAILED-${Date.now()}`,
        amount: amount
      },
      totalAmount: amount,
      couponCode: couponCode || null,
      discountAmount: discountAmount || 0,
      orderId,
      orderStatus: 'Payment Failed',
      reason: error ? JSON.stringify(error) : 'Payment failed or cancelled by user'
    }], { session });

    // Update the temp Payment record to reflect failure
    await Payment.findByIdAndUpdate(
      tempOrderId,
      {
        status: 'failed',
        orderId: order[0].orderId,
        paymentId: paymentId || 'FAILED',
        error: error ? JSON.stringify(error) : 'Payment failed'
      },
      { session }
    );

    await session.commitTransaction();

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Payment failure recorded successfully',
      orderId: order[0].orderId
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error in handlePaymentFailure:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  } finally {
    await session.endSession();
  }
});
