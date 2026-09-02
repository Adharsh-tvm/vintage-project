import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../layout/Layout';
import { Button } from '../../ui/Button';
import { Package, Truck, Check, ArrowLeft, Download, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { downloadInvoiceApi, fetchOrderDetailsApi, userReturnOrderItemApi, userCancelOrderItemApi } from '../../services/api/userApis/userOrderApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/Dialog';
import { Label } from '../../ui/Label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/Select';
import { Textarea } from '../../ui/TextArea';
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

export default function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnDialog, setReturnDialog] = useState({
    open: false,
    orderId: null,
    itemId: null,
    maxQuantity: 1
  });
  const [returnForm, setReturnForm] = useState({
    reason: '',
    additionalDetails: '',
    quantity: 1
  });

  // Cancel item state
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

  const returnReasons = [
    "Defective",
    "Not as described",
    "Wrong size/fit",
    "Changed my mind",
    "Other"
  ];

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetchOrderDetailsApi(orderId)

      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        toast.error('Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'processing':
        return 'text-blue-500';
      case 'shipped':
        return 'text-orange-500';
      case 'delivered':
        return 'text-green-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await downloadInvoiceApi(orderId)

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);

      document.body.appendChild(link);
      link.click();

      // Show toast after a brief delay to ensure download has started
      setTimeout(() => {
        toast('Invoice downloaded successfully', {
          description: 'Your invoice has been downloaded to your device.',
        });
      }, 2000); // 2 seconds delay

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 2500);

    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast('Failed to download invoice', {
        description: 'There was an error downloading your invoice. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReturnSubmit = async () => {
    if (!returnForm.reason.trim()) {
      toast.error('Please provide a reason for return');
      return;
    }
    if (!returnForm.quantity || returnForm.quantity < 1) {
      toast.error('Please select a valid quantity to return');
      return;
    }

    try {
      const response = await userReturnOrderItemApi(
        returnDialog.orderId,
        returnDialog.itemId,
        returnForm
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Return request submitted successfully');
        setReturnDialog({ open: false, orderId: null, itemId: null, maxQuantity: 1 });
        setReturnForm({ reason: '', additionalDetails: '', quantity: 1 });
        fetchOrderDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit return request');
    }
  };

  // --- Cancel item handlers ---
  const handleCancelItemClick = (ordId, itmId, itemName, maxQty) => {
    setCancelItemConfirmDialog({ open: true, orderId: ordId, itemId: itmId, itemName, maxQuantity: maxQty });
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
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel item');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Order not found</p>
          <Button asChild className="mt-4">
            <Link to="/orders">Back to Orders</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 animate-fadeIn">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between mb-6 animate-slideDown">
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              asChild
            >
              <Link to="/orders">
                <ArrowLeft className="h-4 w-4" />
                Back to Orders
              </Link>
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2 hover:bg-gray-100 transition-colors"
              onClick={handleDownloadInvoice}
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl animate-slideUp">
            {/* Order Header */}
            <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-gray-900">Order #{order?.orderId}</h1>
                  <p className="text-gray-600">
                    Placed on {new Date(order?.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 animate-pulse">
                  {getStatusIcon(order?.orderStatus)}
                  <span className={`text-lg font-medium capitalize ${getStatusColor(order?.orderStatus)}`}>
                    {order?.orderStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="p-6 border-b space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Order Summary</h2>
                <div className="text-lg font-semibold text-green-600">
                  Total: ₹{(order?.totalAmount || 0).toFixed(2)}
                </div>
              </div>
              <div className="grid gap-4">
                {order?.items?.map((item) => (
                  <div
                    key={item._id}
                    className="flex flex-col md:flex-row items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="h-24 w-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 transform hover:scale-105 transition-transform">
                      <img
                        src={item.sizeVariant?.mainImage}
                        alt={item.product?.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="font-medium text-lg">{item.product?.name}</h3>
                          <div className="text-gray-600">
                            Size: {item.sizeVariant?.size} •
                            Color: {item.sizeVariant?.color}
                          </div>
                          <div className="text-gray-600">Quantity: {item.quantity}</div>
                          {item.returnedQuantity > 0 && (
                            <div className="text-sm mt-1 text-green-600 font-medium">
                              Returned: {item.returnedQuantity} of {item.quantity} unit(s) refunded
                            </div>
                          )}
                          {item.returnRequested && item.returnStatus === 'Return Pending' && (
                            <div className="text-sm mt-1 text-yellow-600 font-medium">
                              Return Status: Pending ({item.returnQuantity || 1} unit(s) requested)
                            </div>
                          )}
                          {item.returnStatus === 'Return Rejected' && (
                            <div className="text-sm mt-1 text-red-600 font-medium">
                              Return Status: Rejected
                            </div>
                          )}
                        </div>
                          <div className="text-right space-y-1">
                            {item.discountPrice && item.discountPrice < item.price ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="line-through text-xs text-gray-400">₹{(item.price || 0).toFixed(2)}</span>
                                <span className="font-medium text-gray-900">₹{(item.discountPrice || 0).toFixed(2)}</span>
                              </div>
                            ) : (
                              <div className="font-medium text-gray-900">
                                ₹{(item.price || 0).toFixed(2)}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-gray-700">
                              Item Total: ₹{(item.finalPrice ?? (((item.discountPrice || item.price || 0)) * (item.quantity || 1))).toFixed(2)}
                            </div>
                            {item.couponDiscount > 0 && (
                              <div className="text-xs text-green-600 font-medium">
                                Coupon Discount: -₹{(item.couponDiscount || 0).toFixed(2)}
                              </div>
                            )}
                            {/* Cancel Item Button */}
                            {['pending', 'Processing'].includes(item.status) &&
                              ['pending', 'Processing'].includes(order.orderStatus) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="mt-2 flex items-center gap-1 hover:scale-105 transition-transform"
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
                                <XCircle className="h-3.5 w-3.5" />
                                Cancel Item
                                {item.cancelledQuantity > 0 && (
                                  <span className="ml-1 text-xs opacity-80">
                                    ({item.quantity - item.cancelledQuantity} left)
                                  </span>
                                )}
                              </Button>
                            )}
                            {/* Cancelled badge */}
                            {item.status === 'Cancelled' && (
                              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-1">
                                <XCircle className="h-3 w-3" />
                                Cancelled
                              </div>
                            )}
                            {/* Return Item Button for Delivered items with returnable units remaining */}
                            {(() => {
                              const cancelledQty = item.cancelledQuantity || 0;
                              const returnedQty = item.returnedQuantity || 0;
                              const pendingReturnQty = (item.returnRequested && item.returnStatus === 'Return Pending') ? (item.returnQuantity || 0) : 0;
                              const maxReturnable = item.quantity - cancelledQty - returnedQty - pendingReturnQty;

                              if (order.orderStatus === 'Delivered' && maxReturnable > 0 && item.status !== 'Cancelled') {
                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                    onClick={() => {
                                      setReturnDialog({
                                        open: true,
                                        orderId: order.orderId,
                                        itemId: item._id,
                                        maxQuantity: maxReturnable
                                      });
                                      setReturnForm(prev => ({ ...prev, quantity: 1 }));
                                    }}
                                  >
                                    Return Item
                                    {maxReturnable < item.quantity && (
                                      <span className="ml-1 text-xs opacity-80">
                                        ({maxReturnable} left)
                                      </span>
                                    )}
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Details */}
            <div className="p-6 border-b hover:bg-gray-50 transition-colors">
              <h2 className="text-xl font-semibold mb-4">Shipping Details</h2>
              <div className="bg-white p-4 rounded-lg shadow-sm space-y-2">
                <p className="font-medium text-gray-900">{order?.shipping?.address?.fullName}</p>
                <p className="text-gray-600">{order?.shipping?.address?.street}</p>
                <p className="text-gray-600">
                  {order?.shipping?.address?.city}, {order?.shipping?.address?.state} {order?.shipping?.address?.postalCode}
                </p>
                <p className="text-gray-600">Phone: {order?.shipping?.address?.phone}</p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="p-6 hover:bg-gray-50 transition-colors">
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-gray-600">Payment Method</p>
                    <p className="font-medium capitalize text-gray-900">{order?.payment?.method}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600">Payment Status</p>
                    <p className="font-medium capitalize text-gray-900">{order?.payment?.status}</p>
                  </div>
                  {order?.payment?.transactionId && (
                    <div className="space-y-1">
                      <p className="text-gray-600">Transaction ID</p>
                      <p className="font-medium text-gray-900">{order.payment.transactionId}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-gray-600">Total Amount</p>
                    <p className="font-medium text-green-600">₹{(order?.totalAmount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Discount Details */}
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50">
              <h2 className="text-xl font-semibold mb-4">Discount Details</h2>
              <div className="space-y-3">
                {(order?.totalDiscount || 0) > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Total Savings</span>
                    <span>-₹{(order?.totalDiscount || 0).toFixed(2)}</span>
                  </div>
                )}

                {order?.couponCode && (
                  <div className="text-sm text-gray-600 bg-white p-3 rounded-lg shadow-sm">
                    <span>Applied Coupon: {order.couponCode}</span>
                    {(order?.discountAmount || 0) > 0 && (
                      <span className="ml-2 text-green-600">(Saved ₹{(order?.discountAmount || 0).toFixed(2)})</span>
                    )}
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg pt-2 border-t border-green-100">
                  <span>Final Amount</span>
                  <span className="text-green-600">₹{(order?.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

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

          {/* Cancel Item — Step 2: Reason + Quantity Dialog */}
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
                  <Label htmlFor="cancelItemReason" className="text-sm font-medium text-gray-700">
                    Reason for Cancellation
                  </Label>
                  <Textarea
                    id="cancelItemReason"
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

          {/* Return Details Dialog */}
          <Dialog
            open={returnDialog.open}
            onOpenChange={(open) => {
              if (!open) {
                setReturnDialog({ open: false, orderId: null, itemId: null, maxQuantity: 1 });
                setReturnForm({ reason: '', additionalDetails: '', quantity: 1 });
              }
            }}
          >
            <DialogContent className="bg-white rounded-lg shadow-xl sm:max-w-[425px] p-6 animate-scaleUp">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Return Item
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                {/* Quantity Selector */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">
                    Quantity to Return
                    <span className="ml-1 text-gray-400 font-normal">(max {returnDialog.maxQuantity})</span>
                  </Label>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      onClick={() => setReturnForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                      disabled={returnForm.quantity <= 1}
                    >−</button>
                    <span className="w-10 text-center font-semibold text-gray-800">{returnForm.quantity}</span>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      onClick={() => setReturnForm(prev => ({ ...prev, quantity: Math.min(returnDialog.maxQuantity, prev.quantity + 1) }))}
                      disabled={returnForm.quantity >= returnDialog.maxQuantity}
                    >+</button>
                    <span className="text-xs text-gray-500 ml-1">
                      of {returnDialog.maxQuantity} eligible unit(s)
                    </span>
                  </div>
                </div>
                {/* Reason */}
                <div>
                  <Label htmlFor="reason" className="text-gray-700">Reason for Return *</Label>
                  <Select
                    value={returnForm.reason}
                    onValueChange={(value) => setReturnForm(prev => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger className="mt-2 w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {returnReasons.map((reason) => (
                        <SelectItem
                          key={reason}
                          value={reason}
                          className="hover:bg-gray-100 transition-colors"
                        >
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="additionalDetails" className="text-gray-700">Additional Details</Label>
                  <Textarea
                    id="additionalDetails"
                    value={returnForm.additionalDetails}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, additionalDetails: e.target.value }))}
                    placeholder="Any additional information about the return..."
                    className="mt-2 resize-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReturnDialog({ open: false, orderId: null, itemId: null, maxQuantity: 1 });
                    setReturnForm({ reason: '', additionalDetails: '', quantity: 1 });
                  }}
                  className="hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReturnSubmit}
                  disabled={!returnForm.reason.trim() || returnForm.quantity < 1}
                  className="bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  Return {returnForm.quantity} Unit{returnForm.quantity > 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
