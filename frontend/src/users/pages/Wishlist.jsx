import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { Button } from '../../ui/Button';
import { Trash, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '../../hooks/useToast';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromWishlist, setWishlistItems } from '../../redux/slices/wishlistSlice';
import { setCartItems } from '../../redux/slices/cartSlice'; // Add this import
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/AlertDialog";
import { fetchWishlistApi, moveToCartApi, removeWishlistApi } from '../../services/api/userApis/wishlistApi';
import { Loader2 } from 'lucide-react'; // Add this import

export default function Wishlist() {
  const dispatch = useDispatch();
  const { wishlistItems } = useSelector((state) => state.wishlist);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setIsLoading(true); // Set loading to true before fetching
      const response = await fetchWishlistApi()
      dispatch(setWishlistItems(response.data));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch wishlist items",
        duration: 2000,
        className: "bg-white text-black border border-gray-200"
      });
    } finally {
      setIsLoading(false); // Set loading to false after fetching
    }
  };

  const handleRemoveClick = (item) => {
    setItemToRemove(item);
    setIsDialogOpen(true);
  };

  const removeItem = async () => {
    if (!itemToRemove) return;

    try {
      const response = await removeWishlistApi(itemToRemove.variant._id);

      if (response.data.success) {
        dispatch(removeFromWishlist(itemToRemove.variant._id));

        toast({
          title: "Success",
          description: "Item removed from wishlist",
          duration: 2000,
          className: "bg-white text-black border border-gray-200"
        });
      }
    } catch (error) {
      console.error("Remove error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove item from wishlist",
        duration: 2000,
        className: "bg-white text-black border border-gray-200"
      });
    } finally {
      setIsDialogOpen(false);
      setItemToRemove(null);
    }
  };

  const moveToCart = async (item) => {
    try {
      const response = await moveToCartApi(
        {
          variantId: item.variant._id,
          quantity: 1,
          removeFromWishlist: true
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Update cart state with cart data
      if (response.data.cart) {
        dispatch(setCartItems(response.data.cart));
        dispatch(removeFromWishlist(item.variant._id));

        toast({
          title: "Success",
          description: "Item moved to cart",
          duration: 2000,
          className: "bg-white text-black border border-gray-200"
        });
      }
    } catch (error) {
      // Improved error handling to show specific error message
      const errorMessage = error.response?.data?.message || "Failed to move item to cart";
      toast({
        title: "Error",
        description: errorMessage,
        duration: 2000,
        variant: "destructive",
        className: "bg-red-100 text-red-900 border border-red-200"
      });
    }
  };

  const renderWishlistItem = (item) => {
    if (!item?.variant || !item?.product) {
      return null;
    }

    const lowestPrice = item.variant.price;
    const isOutOfStock = item.variant.stock === 0;

    return (
      <div
        key={item.variant._id}
        className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-scaleUp hover:shadow-md transition-all duration-300 group relative"
      >
        {/* Link wraps the image for navigation */}
        <Link to={`/products/${item.product._id}`} className="block relative aspect-square w-full bg-gray-50 overflow-hidden">
          <img
            src={item.variant.mainImage || '/placeholder-image.jpg'}
            alt={item.product.name || 'Product'}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
              <span className="bg-white/90 text-gray-900 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                Out of Stock
              </span>
            </div>
          )}
        </Link>

        {/* Remove Button (absolute positioned, stays on top of hover zoom) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRemoveClick(item);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-[4px] border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-white transition-colors duration-200 z-10"
          title="Remove from wishlist"
        >
          <Trash className="h-3.5 w-3.5" />
        </button>

        {/* Details Container */}
        <div className="p-3 flex-1 flex flex-col justify-between">
          <div className="mb-2">
            {/* Brand / Category */}
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">
                {item.product.brand?.name || 'Brand'}
              </span>
              <span className="text-[8px] text-gray-300">•</span>
              <span className="text-[9px] text-gray-400 truncate">
                {item.product.category?.name}
              </span>
            </div>

            {/* Product Name */}
            <Link
              to={`/products/${item.product._id}`}
              className="block text-xs font-semibold text-gray-800 hover:text-primary line-clamp-1 leading-snug"
            >
              {item.product.name}
            </Link>

            {/* Attributes (Size & Color) */}
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 text-gray-500">
                S: {item.variant.size}
              </span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 text-gray-500 truncate max-w-[60px]">
                {item.variant.color}
              </span>
            </div>
          </div>

          <div>
            {/* Price */}
            <div className="text-xs font-bold text-gray-900 mb-2">
              ₹{lowestPrice.toLocaleString()}
            </div>

            {/* Action */}
            <Button
              size="sm"
              className="w-full font-semibold text-xs h-8 py-1.5"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                moveToCart(item);
              }}
            >
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        <h1 className="text-2xl font-bold mb-6">Your Wishlist</h1>

        {/* Show loader while loading */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px] animate-fadeIn">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-gray-500">Loading wishlist...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Confirmation Dialog */}
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogContent className="bg-white border border-gray-200 shadow-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-semibold text-gray-900">Remove from Wishlist</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600">
                    Are you sure you want to remove this item from your wishlist?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex space-x-2">
                  <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={removeItem}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {wishlistItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 animate-slideUp">
                {wishlistItems.map((item) => renderWishlistItem(item))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center animate-scaleUp">
                <h2 className="text-xl font-medium mb-3">Your wishlist is empty</h2>
                <p className="text-gray-600 mb-4">
                  Items added to your wishlist will appear here.
                </p>
                <Button asChild>
                  <Link to="/products">Discover Products</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
