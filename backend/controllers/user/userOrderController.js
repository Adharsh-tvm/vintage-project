import asyncHandler from '../../middlewares/asyncHandler.js';
import Order from '../../models/product/orderModel.js';
import Cart from '../../models/product/cartModel.js';
import Address from '../../models/userAddressModel.js';
import Variant from '../../models/product/sizeVariantModel.js';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Coupon from '../../models/product/couponModel.js';
import { processReturnRefund } from './userWalletController.js';
import Wallet from '../../models/walletModel.js';
import { HttpStatus } from '../../utils/httpStatus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateOrderId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${year}${month}${day}-${random}`;
};

export const createOrder = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    let transactionStarted = false;

    try {
        await session.startTransaction();
        transactionStarted = true;

        const { addressId, paymentMethod, couponCode, amount } = req.body;
        const userId = req.user._id;
        const orderId = generateOrderId();

        // Add COD validation
        if (paymentMethod === 'cod' && amount > 1000) {
            throw new Error('Cash on Delivery is not available for orders above ₹1000');
        }

        // Handle wallet payment
        if (paymentMethod === 'wallet') {
            const wallet = await Wallet.findOne({ userId }).session(session);
            
            if (!wallet || wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct amount from wallet
            wallet.balance -= amount;
            wallet.transactions.push({
                userId,
                type: 'debit',
                amount,
                description: `Payment for order #${orderId}`,
                date: new Date()
            });
            await wallet.save({ session });
        }

        // 1. Get user's cart
        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: 'items.variant',
                populate: {
                    path: 'product',
                    populate: ['brand', 'category']
                }
            })
            .session(session);

        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // 2. Verify address
        const address = await Address.findById(addressId);
        if (!address) {
            res.status(HttpStatus.NOT_FOUNDyy);
            throw new Error('Delivery address not found');
        }

        // 3. Create order items and verify stock
        const orderItems = [];
        let subtotal = 0;

        for (const item of cart.items) {
            const variant = await Variant.findById(item.variant._id);
            
            // Check product availability
            if (!variant || variant.isBlocked || variant.product.isBlocked) {
                res.status(HttpStatus.BAD_REQUEST);
                throw new Error(`${item.variant.product.name} is no longer available`);
            }

            // Check stock
            if (variant.stock < item.quantity) {
                res.status(HttpStatus.BAD_REQUEST);
                throw new Error(`Insufficient stock for ${item.variant.product.name}`);
            }

            const itemPrice = variant.discountPrice || variant.price;
            const itemTotal = item.quantity * itemPrice;
            subtotal += itemTotal;

            orderItems.push({
                product: item.variant.product._id,
                sizeVariant: item.variant._id,
                quantity: item.quantity,
                price: variant.price, // Original price
                discountPrice: itemPrice, // Store offer/discount price
                status: 'pending'
            });
        }

        // 4. Calculate totals
        const shippingCost = subtotal > 500 ? 0 : 50;

        let couponDiscount = 0;
        let appliedCoupon = null;

        // If coupon is provided, validate and calculate discount
        if (couponCode) {
            appliedCoupon = await Coupon.findOne({
                couponCode,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() },
                isExpired: false,
                usedBy: { $nin: [userId] }
            });

            if (appliedCoupon) {
                // Calculate coupon discount
                if (appliedCoupon.discountType === 'percentage') {
                    couponDiscount = (subtotal * appliedCoupon.discountValue) / 100;
                } else {
                    couponDiscount = appliedCoupon.discountValue;
                }
                couponDiscount = parseFloat(couponDiscount.toFixed(2));
            }
        }

        // Calculate final amounts
        const finalSubtotal = subtotal - couponDiscount;
        const finalTotal = finalSubtotal + shippingCost;

        // Distribute coupon discount proportionally across items
        let accumulatedCouponDiscount = 0;
        const orderItemsWithDiscount = orderItems.map((item, index) => {
            const itemSubtotal = item.discountPrice * item.quantity;
            let itemCouponDiscount = 0;
            if (couponDiscount > 0 && subtotal > 0) {
                if (index === orderItems.length - 1) {
                    itemCouponDiscount = parseFloat((couponDiscount - accumulatedCouponDiscount).toFixed(2));
                } else {
                    itemCouponDiscount = parseFloat(((itemSubtotal / subtotal) * couponDiscount).toFixed(2));
                    accumulatedCouponDiscount += itemCouponDiscount;
                }
            }
            const itemFinalPrice = parseFloat(Math.max(0, itemSubtotal - itemCouponDiscount).toFixed(2));
            return {
                product: item.product,
                sizeVariant: item.sizeVariant,
                quantity: item.quantity,
                price: item.price,
                discountPrice: item.discountPrice,
                couponDiscount: itemCouponDiscount,
                finalPrice: itemFinalPrice,
                status: 'pending'
            };
        });

        // Set payment status based on payment method
        const paymentStatus = {
            cod: 'pending',
            wallet: 'completed',
            online: 'pending'
        }[paymentMethod];

        // Create order with appropriate payment status
        const order = new Order({
            user: userId,
            cart: cart._id,
            items: orderItemsWithDiscount,
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
                status: paymentStatus,
                transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
                amount: finalTotal
            },
            shippingAddress: addressId,
            paymentMethod,
            subtotal: subtotal,
            shippingCost,
            total: finalTotal,
            totalAmount: finalTotal,
            orderId: orderId,
            couponCode: appliedCoupon ? couponCode : null,
            discountAmount: couponDiscount,
            totalDiscount: orderItemsWithDiscount.reduce((acc, item) => {
                const itemOriginalTotal = item.price * item.quantity;
                return acc + (itemOriginalTotal - item.finalPrice);
            }, 0)
        });

        // Save the order first
        await order.save({ session });

        // Update stock for each item after order is saved
        for (const item of orderItemsWithDiscount) {
            await Variant.findByIdAndUpdate(
                item.sizeVariant,
                { $inc: { stock: -item.quantity } },
                { new: true, session }
            );
        }

        // Clear cart
        cart.items = [];
        await cart.save({ session });

        // If coupon was applied successfully, add user to usedBy array
        if (appliedCoupon) {
            await Coupon.findByIdAndUpdate(appliedCoupon._id, {
                $push: { usedBy: userId }
            }, { session });
        }

        await order.save({ session });
        
        await session.commitTransaction();
        transactionStarted = false;

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Order placed successfully',
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            totalDiscount: order.totalDiscount
        });
    } catch (error) {
        if (transactionStarted) {
            await session.abortTransaction();
        }
        res.status(HttpStatus.BAD_REQUEST).json({ message: error.message });
    } finally {
        session.endSession();
    }
});

// Get user orders with pagination and search
export const getOrders = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const userId = req.user._id;

    try {
        // Build search query
        const searchQuery = {
            user: userId,
            $or: [
                { orderId: { $regex: search, $options: 'i' } },
                { orderStatus: { $regex: search, $options: 'i' } },
                { 'shipping.address.fullName': { $regex: search, $options: 'i' } },
                { 'payment.amount': search ? Number(search) || -1 : -1 }
            ]
        };

        const orders = await Order.find(searchQuery)
            .populate({
                path: 'items.product',
                select: 'name images brand category',
                populate: [
                    { path: 'brand', select: 'name' },
                    { path: 'category', select: 'name' }
                ]
            })
            .populate({
                path: 'items.sizeVariant',
                select: 'size color price stock mainImage subImages',
            })
            .populate({
                path: 'shipping.address',
                select: 'fullName phone street city state country postalCode'
            })
            .populate('user', 'firstname lastname email phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Order.countDocuments(searchQuery);

        res.json({
            success: true,
            orders,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalOrders: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            message: "Failed to fetch orders",
            error: error.message 
        });
    }
});

// Get single order
export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findOne({
        orderId: req.params.id,
        user: req.user._id
    })
    .populate({
        path: 'items.product',
        select: 'name images'
    })
    .populate({
        path: 'items.sizeVariant',
        select: 'size color price mainImage subImages'
    })
    .populate({
        path: 'shipping.address',
        select: 'fullName street city state postalCode phone'
    });

    if (order) {
        res.json({
            success: true,
            order
        });
    } else {
        res.status(HttpStatus.NOT_FOUNDyy).json({
            success: false,
            message: 'Order not found'
        });
    }
});

// Cancel order
export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const order = await Order.findOne({ 
      orderId: id,
      user: userId 
    }).populate('items.sizeVariant');

    if (!order) {
      return res.status(HttpStatus.NOT_FOUNDyy).json({ message: 'Order not found' });
    }

    // Check if order can be cancelled
    const allowedStatuses = ['pending', 'Processing'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    // Find or create wallet for refund if payment method was online
    if (order.payment.method === 'online' || order.payment.method === 'wallet' && order.payment.status === 'completed') {
      let wallet = await Wallet.findOne({ userId }).session(session);
      
      if (!wallet) {
        wallet = await Wallet.create([{
          userId,
          balance: 0,
          transactions: []
        }], { session });
        wallet = wallet[0];
      }

      // Add refund to wallet
      wallet.balance += order.payment.amount;
      wallet.transactions.push({
        userId,
        type: 'credit',
        amount: order.payment.amount,
        description: `Refund for cancelled order #${order.orderId}`,
        date: new Date()
      });

      await wallet.save({ session });
    }

    // Update order status and reason
    order.orderStatus = 'Cancelled';
    order.reason = reason;
    
    // Update all items status to cancelled and restore stock
    order.items = order.items.map(item => ({
      ...item,
      status: 'Cancelled',
      cancellationReason: reason
    }));

    // Restore stock for each variant
    for (const item of order.items) {
      await Variant.findByIdAndUpdate(
        item.sizeVariant._id,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    await order.save({ session });
    await session.commitTransaction();

    res.json({ 
      message: 'Order cancelled successfully',
      order 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Cancel order error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
      message: 'Error cancelling order',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Cancel individual order item (supports partial quantity)
export const cancelOrderItem = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const { id: orderId, itemId } = req.params;
    const { reason, quantity } = req.body;
    const userId = req.user._id;

    if (!reason || !reason.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Please provide a reason for cancellation',
      });
    }

    const cancelQty = parseInt(quantity, 10);
    if (!cancelQty || cancelQty < 1) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Please provide a valid quantity to cancel (minimum 1)',
      });
    }

    const order = await Order.findOne({ orderId, user: userId })
      .populate('items.sizeVariant')
      .session(session);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Order item not found' });
    }

    // Validate item can be cancelled
    const cancellableStatuses = ['pending', 'Processing'];
    if (!cancellableStatuses.includes(item.status)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Item cannot be cancelled — current status is "${item.status}"`,
      });
    }

    // How many units are still cancellable
    const alreadyCancelled = item.cancelledQuantity || 0;
    const remainingCancellable = item.quantity - alreadyCancelled;

    if (cancelQty > remainingCancellable) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Cannot cancel ${cancelQty} units — only ${remainingCancellable} unit(s) are available to cancel`,
      });
    }

    // Restore stock for ONLY the cancelled quantity
    await Variant.findByIdAndUpdate(
      item.sizeVariant._id,
      { $inc: { stock: cancelQty } },
      { session }
    );

    // ── Correct Refund Calculation ────────────────────────────────────────────
    // item.finalPrice  = total for this item after product discount (all units)
    // item.quantity    = originally ordered quantity
    // unitNetPrice     = per-unit price after product discount
    // grossRefund      = cancelQty × unitNetPrice
    // couponShare      = grossRefund's proportional share of the coupon discount
    // netRefund        = grossRefund − couponShare
    // ─────────────────────────────────────────────────────────────────────────
    const isPaidOrder =
      (order.payment.method === 'online' || order.payment.method === 'wallet') &&
      order.payment.status === 'completed';

    if (isPaidOrder) {
      const unitNetPrice = item.finalPrice / item.quantity;
      const netRefund = parseFloat(Math.max(0, unitNetPrice * cancelQty).toFixed(2));

      let wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) {
        wallet = await Wallet.create([{ userId, balance: 0, transactions: [] }], { session });
        wallet = wallet[0];
      }

      wallet.balance += netRefund;
      wallet.transactions.push({
        userId,
        type: 'credit',
        amount: netRefund,
        description: `Refund for ${cancelQty} cancelled unit(s) of "${item.product?.name || 'item'}" from order #${order.orderId}`,
        date: new Date(),
      });
      await wallet.save({ session });
    }

    // Update item tracking
    item.cancelledQuantity = alreadyCancelled + cancelQty;
    item.cancellationReason = reason.trim();

    // Mark item as fully cancelled only when all units are cancelled
    if (item.cancelledQuantity >= item.quantity) {
      item.status = 'Cancelled';
    }

    // Cancel whole order only when ALL items are fully cancelled
    const allCancelled = order.items.every(
      (i) => (i.cancelledQuantity || 0) >= i.quantity
    );
    if (allCancelled) {
      order.orderStatus = 'Cancelled';
      order.reason = reason.trim();
    }

    await order.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: `${cancelQty} unit(s) cancelled successfully`,
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Cancel order item error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error cancelling item',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Return order (supports partial quantity)
export const returnOrder = asyncHandler(async (req, res) => {
    const { reason, additionalDetails, quantity } = req.body;
    const { id: orderId, itemId } = req.params;

    const returnQty = parseInt(quantity, 10);
    if (!returnQty || returnQty < 1) {
        res.status(HttpStatus.BAD_REQUEST);
        throw new Error('Please provide a valid quantity to return (minimum 1)');
    }

    const order = await Order.findOne({
        orderId: orderId,
        user: req.user._id
    });

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Find the specific item
    const item = order.items.find(item => item._id.toString() === itemId);

    if (!item) {
        res.status(404);
        throw new Error('Order item not found');
    }

    // Check if order status is Delivered
    if (order.orderStatus !== 'Delivered') {
        res.status(HttpStatus.BAD_REQUEST);
        throw new Error('Order must be delivered before requesting return');
    }

    // How many units are eligible for return (excluding already cancelled, already returned, and pending return)
    const alreadyCancelled = item.cancelledQuantity || 0;
    const alreadyReturned = item.returnedQuantity || 0;
    const pendingReturn = (item.returnRequested && item.returnStatus === 'Return Pending') ? (item.returnQuantity || 0) : 0;
    const maxReturnable = item.quantity - alreadyCancelled - alreadyReturned - pendingReturn;

    if (returnQty > maxReturnable) {
        res.status(HttpStatus.BAD_REQUEST);
        throw new Error(`Cannot return ${returnQty} units — only ${maxReturnable} unit(s) are eligible for return`);
    }

    // Update specific item status
    item.returnRequested = true;
    item.returnReason = reason;
    item.additionalDetails = additionalDetails;
    item.returnStatus = 'Return Pending';
    item.returnQuantity = pendingReturn + returnQty;

    await order.save();

    res.json({
        success: true,
        message: `Return request for ${returnQty} unit(s) submitted successfully`,
        order
    });
});

export const pdfDownloader = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
        .populate('user', 'firstname lastname email')
        .populate('items.product', 'name')
        .populate('items.sizeVariant', 'size color price')
        .populate('shipping.address');

    if (!order) {
        return res.status(HttpStatus.NOT_FOUNDyy).json({ message: "Order not found" });
    }

    const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
    });

    const filePath = path.join(__dirname, `../invoices/invoice-${orderId}.pdf`);

    if (!fs.existsSync(path.join(__dirname, '../invoices'))) {
        fs.mkdirSync(path.join(__dirname, '../invoices'));
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Helper function for drawing borders
    const drawBorder = () => {
        doc.lineWidth(1)
           .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
           .stroke();
    };

    // Add decorative border
    drawBorder();

    // Add company header with styling
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text("VINTAGE", { align: "center" });
    
    doc.fontSize(12)
       .font('Helvetica')
       .text("Your Fashion Destination", { align: "center" });

    // Add decorative line with gradient
    doc.lineWidth(2);
    const gradient = doc.linearGradient(50, doc.y + 10, 550, doc.y + 10);
    gradient.stop(0, '#000000')
           .stop(0.5, '#666666')
           .stop(1, '#000000');
    doc.moveTo(50, doc.y + 10)
       .lineTo(550, doc.y + 10)
       .stroke(gradient);

    doc.moveDown(2);

    // Add invoice title with background
    doc.rect(doc.x, doc.y, 500, 30).fill('#f0f0f0');
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text("INVOICE", { align: "center" });

    doc.moveDown();

    // Create styled info boxes
    const drawInfoBox = (title, content, x, y, width) => {
        doc.rect(x, y, width, 80)
           .lineWidth(1)
           .stroke();
        
        // Title background
        doc.rect(x, y, width, 20)
           .fill('#f0f0f0');
        
        // Title
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text(title, x + 5, y + 5, { width: width - 10 });
        
        // Content
        doc.fontSize(9)
           .font('Helvetica')
           .text(content, x + 5, y + 25, { width: width - 10 });
    };

    // Draw info boxes
    const startY = doc.y;
    drawInfoBox(
        "BILLED TO",
        `${order.user.firstname} ${order.user.lastname}\n${order.user.email}`,
        50, startY, 240
    );

    drawInfoBox(
        "ORDER DETAILS",
        `Order ID: ${order.orderId}\nDate: ${new Date(order.createdAt).toLocaleDateString()}\nPayment: ${order.payment.method.toUpperCase()}`,
        310, startY, 240
    );

    doc.moveDown(4);

    drawInfoBox(
        "SHIPPING ADDRESS",
        `${order.shipping.address.fullName}\n${order.shipping.address.street}\n${order.shipping.address.city}, ${order.shipping.address.state} ${order.shipping.address.postalCode}\nPhone: ${order.shipping.address.phone}`,
        50, doc.y, 500
    );

    doc.moveDown(5);

    // Create styled table
    const createTable = () => {
        const tableTop = doc.y + 10;
        const tableHeaders = ['Item', 'Description', 'Qty', 'Price', 'Total'];
        const columnWidths = [40, 220, 60, 90, 90];
        let xPosition = 50;

        // Draw table header
        doc.rect(50, tableTop, 500, 20).fill('#f0f0f0');
        tableHeaders.forEach((header, i) => {
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text(header, xPosition, tableTop + 5, { width: columnWidths[i], align: 'center' });
            xPosition += columnWidths[i];
        });

        // Draw table content
        let currentY = tableTop + 20;
        order.items.forEach((item, index) => {
            xPosition = 50;
            doc.rect(50, currentY, 500, 30).stroke();
            
            doc.fontSize(9)
               .font('Helvetica')
               .text(`${index + 1}`, xPosition, currentY + 10, { width: columnWidths[0], align: 'center' });
            xPosition += columnWidths[0];
            
            doc.text(`${item.product.name}\n${item.sizeVariant.size}/${item.sizeVariant.color}`, xPosition, currentY + 5, { width: columnWidths[1] });
            xPosition += columnWidths[1];
            
            doc.text(`${item.quantity}`, xPosition, currentY + 10, { width: columnWidths[2], align: 'center' });
            xPosition += columnWidths[2];
            
            doc.text(`₹${item.price}`, xPosition, currentY + 10, { width: columnWidths[3], align: 'right' });
            xPosition += columnWidths[3];
            
            doc.text(`₹${item.finalPrice}`, xPosition, currentY + 10, { width: columnWidths[4], align: 'right' });
            
            currentY += 30;
        });

        return currentY;
    };

    const tableEndY = createTable();

    // Add styled totals section
    doc.rect(350, tableEndY + 10, 200, 100)
       .lineWidth(1)
       .stroke();

    const totalsY = tableEndY + 20;
    ['Subtotal:', 'Shipping:', 'Discount:', 'TOTAL:'].forEach((label, index) => {
        const isTotal = index === 3;
        doc.fontSize(isTotal ? 12 : 10)
           .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
           .text(label, 360, totalsY + (index * 20));
        
        const value = [
            `₹${order.totalAmount - order.shipping.deliveryCharge}`,
            `₹${order.shipping.deliveryCharge}`,
            `₹${order.totalDiscount || 0}`,
            `₹${order.totalAmount}`
        ][index];

        doc.text(value, 460, totalsY + (index * 20), { align: 'right' });
    });

    // Add styled footer
    doc.rect(50, doc.page.height - 100, 500, 40)
       .fill('#f0f0f0');
    
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#000000')
       .text('Thank you for shopping with Vintage!', { align: 'center' })
       .text('For any queries, please contact support@vintage.com', { align: 'center' });

    doc.end();

    stream.on("finish", () => {
        res.download(filePath, `invoice-${order.orderId}.pdf`, (err) => {
            if (err) {
                console.error("Download error:", err);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error downloading invoice" });
            }
            fs.unlinkSync(filePath);
        });
    });
});

const calculateReturnAmount = (orderItem, order) => {
  // How many units are being returned (partial or full)
  const returnQty = orderItem.returnQuantity || orderItem.quantity;
  const unitNetPrice = orderItem.finalPrice / orderItem.quantity;
  const returnAmount = parseFloat(Math.max(0, unitNetPrice * returnQty).toFixed(2));

  return {
    returnAmount,
    returnQty,
  };
};

export const processReturn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { orderId, itemId } = req.body;
      const order = await Order.findOne({ orderId }).session(session);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      const orderItem = order.items.find(item => item._id.toString() === itemId);
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      
      // Calculate return amounts
      const { returnAmount, returnQty } = calculateReturnAmount(orderItem, order);
      
      // Process refund to wallet
      const refundSuccess = await processReturnRefund(
        orderId,
        order.user,
        returnAmount,
        `Refund for ${returnQty} returned unit(s) from order #${order.orderId}`
      );

      if (!refundSuccess) {
        throw new Error('Failed to process refund to wallet');
      }
      
      // Update item status and tracking
      const newReturnedQty = (orderItem.returnedQuantity || 0) + returnQty;
      orderItem.returnedQuantity = newReturnedQty;
      orderItem.returnQuantity = 0;
      orderItem.returnProcessed = true;

      if (newReturnedQty + (orderItem.cancelledQuantity || 0) >= orderItem.quantity) {
        orderItem.status = 'Returned';
        orderItem.returnRequested = true;
        orderItem.returnStatus = 'Refunded';
      } else {
        orderItem.returnRequested = false;
        orderItem.returnStatus = 'Return Approved';
      }

      await order.save({ session });
      
      res.json({
        success: true,
        message: 'Return processed and refund added to wallet successfully',
        returnAmount,
        updatedOrder: order
      });
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
  } finally {
    session.endSession();
  }
};