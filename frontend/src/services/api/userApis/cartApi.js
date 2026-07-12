import { API } from '../api';

export const fetchCartApi = () => API.get('/user/cart');
export const updateQuantityApi = async (variantId, quantity) => {
    const res = await API.put(`/user/cart/update`, { variantId, quantity });
    window.dispatchEvent(new Event('cartUpdated'));
    return res;
};
export const confirmRemoveApi = async (variantId) => {
    const res = await API.delete(`/user/cart/remove/${variantId}`, { variantId });
    window.dispatchEvent(new Event('cartUpdated'));
    return res;
};
export const cartCountApi = () => API.get('/user/cart');

