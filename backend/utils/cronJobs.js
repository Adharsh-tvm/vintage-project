import cron from 'node-cron';
import Coupon from '../models/product/couponModel.js';
import { calculateAndUpdateDiscounts } from './calculateDiscounts.js';

export const initCouponExpirationCheck = async () => {
  cron.schedule('0 0 * * *', async () => {  
    try {   
        const currentDate = new Date()
        
        await Coupon.updateMany(
          {
            endDate: { $lt: currentDate },
            isExpired: false,
          },
          {
            $set: {
              isExpired: true,
            },
          }
        );

        console.log('Coupon expiration check completed.');
      } catch (error) {
        console.error('Error checking coupon expiration:', error);
      }
    });

};

// Runs once on startup to fix any stale discount prices left over from expired/deactivated offers
export const initOfferDiscountRecalculation = async () => {
  try {
    console.log('Running initial offer discount recalculation...');
    await calculateAndUpdateDiscounts();
    console.log('Initial offer discount recalculation complete.');
  } catch (error) {
    console.error('Error during initial offer discount recalculation:', error);
  }

  // Also schedule a daily recalculation to clean up naturally expired offers
  cron.schedule('0 0 * * *', async () => {
    try {
      await calculateAndUpdateDiscounts();
      console.log('Daily offer discount recalculation complete.');
    } catch (error) {
      console.error('Error during daily offer discount recalculation:', error);
    }
  });
};