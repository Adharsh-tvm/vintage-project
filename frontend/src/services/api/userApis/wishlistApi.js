import { API } from '../api';

export const wishlistCountApi = () => API.get('/user/wishlist');
export const fetchWishlistApi = () => API.get('/user/wishlist');
export const removeWishlistApi = async (id) => {
    const res = await API.delete(`/user/wishlist/${id}`);
    window.dispatchEvent(new Event('wishlistUpdated'));
    return res;
};
export const moveToCartApi = async (data) => {
    const res = await API.post('/user/cart/add', data);
    window.dispatchEvent(new Event('cartUpdated'));
    window.dispatchEvent(new Event('wishlistUpdated'));
    return res;
};
