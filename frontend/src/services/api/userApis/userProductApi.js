import { API } from '../api';

export const fetchProductDetailApi = (id) => API.get(`/products/${id}`)
export const fetchRelatedProductsApi = (data) => API.get(`/products`, data)
export const addToCartApi = async (data) => {
    const res = await API.post(`/user/cart/add`, data);
    window.dispatchEvent(new Event('cartUpdated'));
    return res;
};
export const addToWishlistApi = async (data) => {
    const res = await API.post(`/user/wishlist`, data);
    window.dispatchEvent(new Event('wishlistUpdated'));
    return res;
};

export const productsListHandleSearch = (search) => API.get(`/api/products/search?keyword=${search}`)
export const productsListfetchProducts = (params) => API.get(`/products?${params}`)
export const productsListfetchCategories = () => API.get(`/products/categories`)
export const productsListfetchBrands = () => API.get(`/products/brands`)

export const globalSearchApi = (searchTerm) => API.get(`/products/search?keyword=${searchTerm}`)