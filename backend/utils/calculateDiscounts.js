import Offer from '../models/product/offerModel.js';
import Product from '../models/product/productModel.js';
import Variant from '../models/product/sizeVariantModel.js';
import mongoose from 'mongoose';

export const calculateAndUpdateDiscounts = async () => {
  try {
    // Get all active offers sorted by creation date (newest first)
    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).sort({ createdAt: -1 });

    // Create a map to track which variants have been processed (store as strings for dedup)
    const processedVariantIds = new Set();

    // Process each active offer
    for (const offer of activeOffers) {
      if (offer.offerType === "product") {
        // Handle product-specific offers
        for (const productId of offer.items) {
          const variants = await Variant.find({ product: productId });
          for (const variant of variants) {
            if (!processedVariantIds.has(variant._id.toString())) {
              const discountAmount = (variant.price * offer.discountPercentage) / 100;
              const discountedPrice = Math.round(variant.price - discountAmount);
              await Variant.findByIdAndUpdate(
                variant._id,
                { 
                  discountPrice: discountedPrice,
                  activeOffer: offer._id // Track which offer is applied
                }
              );
              processedVariantIds.add(variant._id.toString());
            }
          }
        }
      } else if (offer.offerType === "category") {
        // Handle category-wide offers
        for (const categoryId of offer.items) {
          const products = await Product.find({ category: categoryId });
          for (const product of products) {
            const variants = await Variant.find({ product: product._id });
            for (const variant of variants) {
              if (!processedVariantIds.has(variant._id.toString())) {
                const discountAmount = (variant.price * offer.discountPercentage) / 100;
                const discountedPrice = Math.round(variant.price - discountAmount);
                await Variant.findByIdAndUpdate(
                  variant._id,
                  { 
                    discountPrice: discountedPrice,
                    activeOffer: offer._id
                  }
                );
                processedVariantIds.add(variant._id.toString());
              }
            }
          }
        }
      }
    }

    // Convert string IDs back to ObjectIds for proper MongoDB $nin comparison
    const processedObjectIds = Array.from(processedVariantIds).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Reset discount prices for all variants not covered by any active offer
    await Variant.updateMany(
      { _id: { $nin: processedObjectIds } },
      { $unset: { discountPrice: "", activeOffer: "" } }
    );
  } catch (error) {
    console.error('Error calculating discounts:', error);
    throw error;
  }
}; 