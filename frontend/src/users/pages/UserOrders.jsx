import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { Button } from '../../ui/Button';
import { ArrowRight, Download, Package, Truck, Check, Search, XCircle, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../ui/Dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../ui/Tabs';
import { ChevronDown } from 'lucide-react';
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
import { Label } from "../../ui/Label";
import { Textarea } from "../../ui/TextArea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/Select";
import { Input } from '../../ui/Input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../../ui/pagination';
import { debounce } from 'lodash';
import { useSearchParams } from 'react-router-dom';
import { userCancelOrderApi, userfetchOrdersApi, userReturnOrderApi, userCancelOrderItemApi } from '../../services/api/userApis/userOrderApi';
import { motion, AnimatePresence } from 'framer-motion';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [itemsPerPage] = useState(parseInt(searchParams.get('limit')) || 5);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Add returnReasons constant here
  const returnReasons = [
    "Defective",
    "Not as described",
    "Wrong size/fit",
    "Changed my mind",
    "Other"
  ];

  const [returnConfirmDialog, setReturnConfirmDialog] = useState({ 
    open: false, 
    orderId: null 
  });
  const [returnDialog, setReturnDialog] = useState({ 
    open: false, 
    orderId: null 
  });
  const [returnForm, setReturnForm] = useState({
    reason: '',
    additionalDetails: ''
  });
  const [confirmDialog, setConfirmDialog] = useState({ 
    open: false, 
    orderId: null 
  });
  const [cancelDialog, setCancelDialog] = useState({ 
    open: false, 
    orderId: null 
  });
  const [cancelReason, setCancelReason] = useState('');

  // Per-item cancel state
  const [cancelItemConfirmDialog, setCancelItemConfirmDialog] = useState({
    open: false,
    orderId: null,
    itemId: null,
    itemName: '',
    maxQuantity: 1
  });
  const [cancelItemDialog, setCancelItemDialog] = useState({
    open: false,
    orderId: null,
    itemId: null,
    maxQuantity: 1
  });
  const [cancelItemReason, setCancelItemReason] = useState('');
  const [cancelItemQuantity, setCancelItemQuantity] = useState(1);

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((value) => {
      const params = new URLSearchParams(searchParams);
      params.set('search', value);
      params.set('page', '1');
      setSearchParams(params);
    }, 500),
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    fetchOrders();
  }, [searchParams]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams(searchParams);
      if (!params.has('page')) params.set('page', currentPage.toString());
      if (!params.has('limit')) params.set('limit', itemsPerPage.toString());
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await userfetchOrdersApi(params)
      
      if (response.data.success) {
        setOrders(response.data.orders);
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleCancelClick = (orderId) => {
    setConfirmDialog({ open: true, orderId });
  };

  const handleConfirmCancellation = () => {
    setCancelDialog({ open: true, orderId: confirmDialog.orderId });
    setConfirmDialog({ open: false, orderId: null });
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      await userCancelOrderApi(cancelDialog.orderId, cancelReason)
      toast.success('Order cancelled successfully');
      setCancelDialog({ open: false, orderId: null });
      setCancelReason('');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  // Per-item cancel handlers
  const handleCancelItemClick = (orderId, itemId, itemName, maxQty) => {
    setCancelItemConfirmDialog({ open: true, orderId, itemId, itemName, maxQuantity: maxQty });
  };

  const handleCancelItemConfirmation = () => {
    setCancelItemDialog({
      open: true,
      orderId: cancelItemConfirmDialog.orderId,
      itemId: cancelItemConfirmDialog.itemId,
      maxQuantity: cancelItemConfirmDialog.maxQuantity
    });
    setCancelItemQuantity(1);
    setCancelItemConfirmDialog({ open: false, orderId: null, itemId: null, itemName: '', maxQuantity: 1 });
  };

  const handleCancelItemSubmit = async () => {
    if (!cancelItemReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    if (!cancelItemQuantity || cancelItemQuantity < 1) {
      toast.error('Please select a valid quantity to cancel');
      return;
    }
    try {
      await userCancelOrderItemApi(cancelItemDialog.orderId, cancelItemDialog.itemId, cancelItemReason, cancelItemQuantity);
      toast.success(`${cancelItemQuantity} unit(s) cancelled successfully`);
      setCancelItemDialog({ open: false, orderId: null, itemId: null, maxQuantity: 1 });
      setCancelItemReason('');
      setCancelItemQuantity(1);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel item');
    }
  };

  const handleReturnClick = (orderId) => {
    setReturnConfirmDialog({ open: true, orderId });
  };

  const handleReturnConfirmation = () => {
    setReturnDialog({ open: true, orderId: returnConfirmDialog.orderId });
    setReturnConfirmDialog({ open: false, orderId: null });
  };

  const handleReturnSubmit = async () => {
    if (!returnForm.reason.trim()) {
      toast.error('Please provide a reason for return');
      return;
    }

    try {
      
      await userReturnOrderApi(returnDialog.orderId, returnForm)
      
      toast.success('Return request submitted successfully');
      setReturnDialog({ open: false, orderId: null });
      setReturnForm({ reason: '', additionalDetails: '' });
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit return request');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-orange-500" />;
      case 'delivered':
        return <Check className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto px-4 py-8"
      >
        <motion.div 
          className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
            Your Orders
          </h1>
          <Button asChild variant="outline" className="group flex items-center gap-2 hover:scale-105 transition-transform">
            <Link to="/products">
              Continue Shopping 
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>

        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search orders by ID, status, amount, or date..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 w-full md:w-96 transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </motion.div>

        {loading ? (
          <LoadingSkeleton />
        ) : orders.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence>
              {orders.map((order) => (
                <motion.div
                  key={order._id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-lg shadow-sm overflow-hidden p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <div className="text-sm font-medium text-primary">Order #{order.orderId}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        {order.items?.length} items
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        ₹{order.totalAmount.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.orderStatus)}
                        <span className="text-sm capitalize">{order.orderStatus}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {['pending', 'Processing'].includes(order.orderStatus) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelClick(order.orderId)}
                          className="hover:scale-105 transition-transform"
                        >
                          Cancel Order
                        </Button>
                      )}
                      {/* Per-item cancel buttons for pending/processing orders */}
                      {['pending', 'Processing'].includes(order.orderStatus) && order.items?.length > 1 && (
                        <div className="w-full mt-2 space-y-1">
                          <p className="text-xs text-gray-400 font-medium">Cancel individual items:</p>
                          {order.items.map((item) => (
                            !['Cancelled'].includes(item.status) && (
                              <div key={item._id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                                <span className="text-xs text-gray-600 truncate max-w-[160px]">
                                  {item.product?.name || 'Item'}
                                  {item.cancelledQuantity > 0 && (
                                    <span className="ml-1 text-gray-400">({item.quantity - item.cancelledQuantity} left)</span>
                                  )}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-2 flex items-center gap-1"
                                  onClick={() => {
                                    const cancellable = item.quantity - (item.cancelledQuantity || 0);
                                    handleCancelItemClick(
                                      order.orderId,
                                      item._id,
                                      item.product?.name,
                                      cancellable
                                    );
                                  }}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Cancel
                                </Button>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                      {order.orderStatus === 'Delivered' && (
                        <>
                          {order.items.some(item => item.returnRequested) ? (
                            <div className={`text-sm px-2 py-1 rounded ${
                              order.items.find(item => item.returnRequested)?.returnStatus === 'Return Approved' 
                                ? 'bg-green-100 text-green-800'
                                : order.items.find(item => item.returnRequested)?.returnStatus === 'Return Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.items.find(item => item.returnRequested)?.returnStatus}
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReturnClick(order.orderId)}
                            >
                              Return
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/order-details/${order.orderId}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No orders found</p>
          </motion.div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog 
          open={confirmDialog.open}
          onOpenChange={(open) => {
            if (!open) setConfirmDialog({ open: false, orderId: null });
          }}
        >
          <AlertDialogContent className="bg-white rounded-lg shadow-lg sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                Cancel Order
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500">
                Are you sure you want to cancel this order? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex justify-end gap-3 mt-6">
              <AlertDialogCancel
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setConfirmDialog({ open: false, orderId: null })}
              >
                No, keep order
              </AlertDialogCancel>
              <AlertDialogAction
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                onClick={handleConfirmCancellation}
              >
                Yes, cancel order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reason Input Dialog */}
        <Dialog 
          open={cancelDialog.open} 
          onOpenChange={(open) => {
            if (!open) {
              setCancelDialog({ open: false, orderId: null });
              setCancelReason('');
            }
          }}
        >
          <DialogContent className="bg-white rounded-lg shadow-lg sm:max-w-[425px] p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Cancellation Reason
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                Please tell us why you're cancelling this order.
              </p>
            </DialogHeader>
            <div className="mt-4">
              <Label 
                htmlFor="reason" 
                className="text-sm font-medium text-gray-700"
              >
                Reason for Cancellation
              </Label>
              <Textarea
                id="reason"
                placeholder="Please provide details about why you're cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-2 min-h-[100px] w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <DialogFooter className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialog({ open: false, orderId: null });
                  setCancelReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelConfirm}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit & Cancel Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Confirmation Dialog */}
        <AlertDialog 
          open={returnConfirmDialog.open}
          onOpenChange={(open) => {
            if (!open) setReturnConfirmDialog({ open: false, orderId: null });
          }}
        >
          <AlertDialogContent className="bg-white rounded-lg shadow-lg sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                Return Order
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500">
                Are you sure you want to return this order? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex justify-end gap-3 mt-6">
              <AlertDialogCancel
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                No, keep order
              </AlertDialogCancel>
              <AlertDialogAction
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                onClick={handleReturnConfirmation}
              >
                Yes, return order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Return Details Dialog */}
        <Dialog 
          open={returnDialog.open} 
          onOpenChange={(open) => {
            if (!open) {
              setReturnDialog({ open: false, orderId: null });
              setReturnForm({ reason: '', additionalDetails: '' });
            }
          }}
        >
          <DialogContent className="bg-white rounded-lg shadow-lg sm:max-w-[425px] p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Return Details
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Return *</Label>
                <Select
                  value={returnForm.reason}
                  onValueChange={(value) => setReturnForm(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {returnReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="additionalDetails">Additional Details</Label>
                <Textarea
                  id="additionalDetails"
                  value={returnForm.additionalDetails}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, additionalDetails: e.target.value }))}
                  placeholder="Any additional information about the return..."
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setReturnDialog({ open: false, orderId: null });
                  setReturnForm({ reason: '', additionalDetails: '' });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleReturnSubmit}
                disabled={!returnForm.reason.trim()}
              >
                Submit Return Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Cancel Item — Step 1: Confirmation AlertDialog */}
        <AlertDialog
          open={cancelItemConfirmDialog.open}
          onOpenChange={(open) => {
            if (!open) setCancelItemConfirmDialog({ open: false, orderId: null, itemId: null, itemName: '' });
          }}
        >
          <AlertDialogContent className="bg-white rounded-lg shadow-lg sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                Cancel Item
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500">
                Are you sure you want to cancel{' '}
                <span className="font-medium text-gray-800">"{cancelItemConfirmDialog.itemName}"</span>?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex justify-end gap-3 mt-6">
              <AlertDialogCancel
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setCancelItemConfirmDialog({ open: false, orderId: null, itemId: null, itemName: '' })}
              >
                No, keep item
              </AlertDialogCancel>
              <AlertDialogAction
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                onClick={handleCancelItemConfirmation}
              >
                Yes, cancel item
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Item — Step 2: Quantity + Reason Dialog */}
        <Dialog
          open={cancelItemDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setCancelItemDialog({ open: false, orderId: null, itemId: null, maxQuantity: 1 });
              setCancelItemReason('');
              setCancelItemQuantity(1);
            }
          }}
        >
          <DialogContent className="bg-white rounded-lg shadow-lg sm:max-w-[425px] p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Cancel Item
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-2">
                Select how many units to cancel and tell us why.
              </p>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {/* Quantity Selector */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Quantity to Cancel
                  <span className="ml-1 text-gray-400 font-normal">(max {cancelItemDialog.maxQuantity})</span>
                </Label>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCancelItemQuantity(q => Math.max(1, q - 1))}
                    disabled={cancelItemQuantity <= 1}
                  >−</button>
                  <span className="w-10 text-center font-semibold text-gray-800">{cancelItemQuantity}</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCancelItemQuantity(q => Math.min(cancelItemDialog.maxQuantity, q + 1))}
                    disabled={cancelItemQuantity >= cancelItemDialog.maxQuantity}
                  >+</button>
                  <span className="text-xs text-gray-500 ml-1">
                    of {cancelItemDialog.maxQuantity} cancellable unit(s)
                  </span>
                </div>
              </div>
              {/* Reason */}
              <div>
                <Label htmlFor="cancelItemReasonOrders" className="text-sm font-medium text-gray-700">
                  Reason for Cancellation
                </Label>
                <Textarea
                  id="cancelItemReasonOrders"
                  placeholder="Please provide details about why you're cancelling..."
                  value={cancelItemReason}
                  onChange={(e) => setCancelItemReason(e.target.value)}
                  className="mt-2 min-h-[90px] w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelItemDialog({ open: false, orderId: null, itemId: null, maxQuantity: 1 });
                  setCancelItemReason('');
                  setCancelItemQuantity(1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelItemSubmit}
                disabled={!cancelItemReason.trim() || cancelItemQuantity < 1}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel {cancelItemQuantity} Unit{cancelItemQuantity > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pagination */}
        {totalPages > 1 && (

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
};
