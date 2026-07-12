import { API } from '../api';

export const checkoutAddressApi = (data) => API.post('/user/profile/address', data);
export const fetchCheckoutAddressApi = () => API.get('/user/profile/address');
export const fetchCheckoutCouponsApi = () => API.get('/user/coupons/available');
export const fetchCheckoutWalletBalanceApi = () => API.get('/user/profile/wallet');
export const orderResponseApi = async (data) => {
    const res = await API.post(`/user/orders`, data);
    window.dispatchEvent(new Event('cartUpdated'));
    return res;
};
export const paymentResponseApi = (data) => API.post(`/payments/create-order`, data)
export const verifyResponseApi = async (data) => {
    const res = await API.post('/payments/verify', data);
    window.dispatchEvent(new Event('cartUpdated'));
    return res;
};
export const recordFailedPaymentApi = (data) => API.post('/payments/failed', data);
export const applyCouponApi = (data) => API.post('/user/coupons/apply', data)
export const calculateCouponApi = (data) => API.post('/user/coupons/calculate-price', data)
