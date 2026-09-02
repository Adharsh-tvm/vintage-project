import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { 
  Search, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  CreditCard, 
  User, 
  MapPin, 
  Tag, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/Table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../ui/Card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../ui/pagination";
import { useSearchParams } from 'react-router-dom';
import { debounce } from 'lodash';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/Dialog";
import { fetchReturnsApi, updateReturnApi } from '../../services/api/adminApis/returnApi';

function ReturnOrderDetailsView({ order, handleReturnAction }) {
  if (!order) return null;

  const user = order.user;
  const customerName = user
    ? (user.firstname ? `${user.firstname} ${user.lastname || ''}`.trim() : (user.name || user.fullName || ''))
    : order.shipping?.address?.fullName || 'N/A';

  const customerEmail = user?.email || 'N/A';
  const customerPhone = user?.phone || order.shipping?.address?.phone || 'N/A';
  const address = order.shipping?.address;

  const paymentMethod = (order.payment?.method || 'N/A').toUpperCase();
  const paymentStatus = order.payment?.status || 'pending';
  const transactionId = order.payment?.transactionId || 'N/A';

  const returnItems = order.items?.filter(item => item.returnRequested || item.status === 'Returned' || item.returnStatus === 'Return Approved' || item.returnStatus === 'Refunded');

  return (
    <div className="space-y-6 text-sm">
      {/* Return Request Highlight Banner */}
      {returnItems && returnItems.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span>Return Request Details ({returnItems.length})</span>
          </div>
          <div className="space-y-2">
            {returnItems.map((item, idx) => (
              <div key={item._id || idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-amber-100 rounded-md">
                <div className="flex items-center gap-3">
                  <img
                    src={item.sizeVariant?.mainImage || item.product?.images?.[0] || 'https://via.placeholder.com/80'}
                    alt={item.product?.name || 'Product'}
                    className="h-10 w-10 object-cover rounded border"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{item.product?.name || 'Product'}</p>
                    <p className="text-xs text-gray-600">
                      Reason: <span className="font-medium text-amber-800">{item.returnReason || 'Not specified'}</span>
                      {item.additionalDetails && ` (${item.additionalDetails})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    item.returnStatus === 'Return Pending' ? 'bg-yellow-100 text-yellow-800' :
                    item.returnStatus === 'Return Approved' || item.returnStatus === 'Refunded' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.returnStatus || 'Return Pending'}
                  </span>

                  {item.returnStatus === 'Return Pending' && handleReturnAction && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-50 text-green-700 hover:bg-green-100 h-8 px-3 text-xs"
                        onClick={() => handleReturnAction(order._id, item._id, 'accept')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-50 text-red-700 hover:bg-red-100 h-8 px-3 text-xs"
                        onClick={() => handleReturnAction(order._id, item._id, 'reject')}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Banner: Status & References */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 border rounded-lg">
        <div className="space-y-1">
          <span className="text-xs text-gray-500 uppercase font-semibold">Order Reference</span>
          <h3 className="text-lg font-bold text-gray-900">{order.orderId}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Placed on: {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5 text-right">Order Status</span>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
            order.orderStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
            order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
            order.orderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {order.orderStatus}
          </span>
        </div>
      </div>

      {/* Grid for Customer, Shipping & Payment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Details */}
        <div className="p-4 border rounded-lg bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
            <User className="h-4 w-4 text-primary" />
            <span>Customer Info</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Name</p>
            <p className="font-medium text-gray-800">{customerName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-medium text-gray-800 break-all">{customerEmail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="font-medium text-gray-800">{customerPhone}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="p-4 border rounded-lg bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Shipping Address</span>
          </div>
          {address ? (
            <div className="text-gray-800 leading-snug space-y-1">
              <p className="font-medium">{address.fullName}</p>
              <p className="text-xs text-gray-600">{address.street}</p>
              <p className="text-xs text-gray-600">{address.city}, {address.state} {address.postalCode}</p>
              <p className="text-xs text-gray-600">{address.country}</p>
              <p className="text-xs text-gray-500 pt-1">Phone: {address.phone}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-xs">No address provided</p>
          )}
        </div>

        {/* Payment Details */}
        <div className="p-4 border rounded-lg bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold text-gray-900 border-b pb-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span>Payment Details</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Payment Method</span>
            <span className="font-medium text-gray-800 uppercase">{paymentMethod}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Payment Status</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
              paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
              paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {paymentStatus}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Transaction ID</p>
            <p className="font-mono text-xs text-gray-700 break-all">{transactionId}</p>
          </div>
        </div>
      </div>

      {/* Ordered Items Table */}
      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Package className="h-4 w-4 text-primary" />
            <span>All Items in Order ({order.items?.length || 0})</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/70 border-b text-gray-600 font-medium">
                <th className="p-2.5">Product</th>
                <th className="p-2.5">Variant</th>
                <th className="p-2.5 text-center">Qty</th>
                <th className="p-2.5 text-right">Unit Price</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items?.map((item, idx) => {
                const imgUrl = item.sizeVariant?.mainImage || item.product?.images?.[0] || 'https://via.placeholder.com/80';
                const productName = item.product?.name || item.name || 'Product Item';
                const size = item.sizeVariant?.size || item.size || 'N/A';
                const color = item.sizeVariant?.color || item.color || 'N/A';
                const unitPrice = item.discountPrice || item.price || 0;
                const itemTotal = item.finalPrice ?? (unitPrice * item.quantity);

                return (
                  <tr key={item._id || idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-2.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={imgUrl}
                          alt={productName}
                          className="h-12 w-12 object-cover rounded border bg-gray-50 flex-shrink-0"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }}
                        />
                        <div>
                          <p className="font-medium text-gray-900 text-sm line-clamp-1">{productName}</p>
                          {item.product?.brand && (
                            <p className="text-xs text-gray-500">Brand: {item.product.brand}</p>
                          )}
                          {item.returnReason && (
                            <p className="text-xs text-amber-700 italic mt-0.5">Return Reason: {item.returnReason}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 text-gray-600">
                      <div>Size: <span className="font-medium text-gray-800">{size}</span></div>
                      <div>Color: <span className="font-medium text-gray-800">{color}</span></div>
                    </td>
                    <td className="p-2.5 text-center font-semibold text-gray-800">{item.quantity}</td>
                    <td className="p-2.5 text-right font-medium">
                      ₹{(unitPrice || 0).toFixed(2)}
                      {item.price > item.discountPrice && item.discountPrice > 0 && (
                        <div className="text-[10px] text-gray-400 line-through">₹{(item.price || 0).toFixed(2)}</div>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-bold text-gray-900">₹{(itemTotal || 0).toFixed(2)}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        item.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        item.status === 'Returned' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status || order.orderStatus}
                      </span>
                      {item.returnStatus && item.returnStatus !== 'Return Pending' && (
                        <div className="text-[10px] font-medium text-gray-500 mt-0.5">{item.returnStatus}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="p-4 border rounded-lg bg-gray-50/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1 text-xs text-gray-600">
          {order.couponCode && (
            <div className="flex items-center gap-1.5 text-green-700 font-medium">
              <Tag className="h-3.5 w-3.5" />
              <span>Applied Coupon: <strong className="uppercase">{order.couponCode}</strong> (-₹{(order.discountAmount || 0).toFixed(2)})</span>
            </div>
          )}
          <p>Shipping Charge: ₹{(order.shipping?.deliveryCharge || 0).toFixed(2)} ({order.shipping?.shippingMethod || 'Standard'})</p>
        </div>

        <div className="w-full md:w-64 space-y-1.5 border-t md:border-t-0 md:border-l md:pl-4 pt-2 md:pt-0 border-gray-200">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Subtotal</span>
            <span>₹{(order.subtotal || order.items?.reduce((a, b) => a + ((b.price || b.discountPrice || 0) * b.quantity), 0) || 0).toFixed(2)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Coupon Discount</span>
              <span>-₹{(order.discountAmount || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-600">
            <span>Shipping Charge</span>
            <span>₹{(order.shipping?.deliveryCharge || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-1.5">
            <span>Total Amount</span>
            <span className="text-green-600">₹{(order.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [itemsPerPage] = useState(parseInt(searchParams.get('limit')) || 5);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');

  const [expandedReturns, setExpandedReturns] = useState(new Set());
  const [selectedModalOrder, setSelectedModalOrder] = useState(null);

  const debouncedSearch = useCallback(
    debounce((value) => {
      const params = new URLSearchParams(searchParams);
      params.set('search', value);
      params.set('page', '1');
      setSearchParams(params);
    }, 500),
    [searchParams, setSearchParams]
  );

  const fetchReturns = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams(searchParams);
      
      if (!params.has('page')) params.set('page', currentPage.toString());
      if (!params.has('limit')) params.set('limit', itemsPerPage.toString());
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const response = await fetchReturnsApi(params);

      setReturns(response.data.returns);
      setTotalPages(response.data.pagination.totalPages);

      if (selectedModalOrder) {
        const updated = response.data.returns.find(o => o._id === selectedModalOrder._id);
        if (updated) setSelectedModalOrder(updated);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Failed to fetch return requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    debouncedSearch(searchQuery);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    setCurrentPage(newPage);
  };

  const handleFilterChange = (status) => {
    const params = new URLSearchParams(searchParams);
    params.set('status', status);
    params.set('page', '1');
    setSearchParams(params);
    setFilterStatus(status);
  };

  const handleReturnAction = async (orderId, itemId, action) => {
    try {
      const response = await updateReturnApi(orderId, itemId, { returnStatus: action });
      
      if (response.data) {
        toast.success(`Return request ${action}ed successfully`);
        fetchReturns();
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error(error.response?.data?.message || `Failed to ${action} return request`);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const toggleReturnDetails = (orderId) => {
    setExpandedReturns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Return Requests</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:flex-none sm:max-w-md">
              <Input
                placeholder="Search by Order ID, Customer or Product"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <Button type="submit" className="whitespace-nowrap">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClearSearch}
                className="whitespace-nowrap"
              >
                Clear
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <select
                  value={filterStatus}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="border rounded p-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="Return Pending">Pending</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Return Rejected">Rejected</option>
                </select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Return Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.length > 0 ? (
                    returns.flatMap((order) => 
                      order.items
                        .filter(item => item.returnRequested || item.status === 'Returned' || item.returnStatus === 'Return Approved' || item.returnStatus === 'Refunded')
                        .map((item) => {
                          const user = order.user;
                          const customerName = user
                            ? (user.firstname ? `${user.firstname} ${user.lastname || ''}`.trim() : (user.name || user.fullName || ''))
                            : order.shipping?.address?.fullName || 'N/A';

                          return (
                            <React.Fragment key={`${order._id}-${item._id}`}>
                              <TableRow className="hover:bg-gray-50 transition-colors">
                                <TableCell className="font-mono font-medium text-gray-900">{order.orderId}</TableCell>
                                <TableCell className="text-xs text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-medium text-gray-800">{customerName}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={item.sizeVariant?.mainImage || item.product?.images?.[0] || 'https://via.placeholder.com/80'}
                                      alt={item.product?.name || 'Product'}
                                      className="w-10 h-10 object-cover rounded border flex-shrink-0"
                                      onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }}
                                    />
                                    <div>
                                      <p className="font-medium text-xs text-gray-900 line-clamp-1">{item.product?.name || 'Product'}</p>
                                      <p className="text-[11px] text-gray-500">Qty: {item.quantity} ({item.sizeVariant?.size || 'N/A'})</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-gray-700 font-medium">
                                  {item.returnReason || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    item.returnStatus === 'Return Pending' ? 'bg-yellow-100 text-yellow-800' :
                                    item.returnStatus === 'Return Approved' || item.returnStatus === 'Refunded' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {item.returnStatus || 'Return Pending'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {item.returnStatus === 'Return Pending' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-green-50 text-green-700 hover:bg-green-100 h-8 px-2 text-xs"
                                          onClick={() => handleReturnAction(order._id, item._id, 'accept')}
                                        >
                                          Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-red-50 text-red-700 hover:bg-red-100 h-8 px-2 text-xs"
                                          onClick={() => handleReturnAction(order._id, item._id, 'reject')}
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedModalOrder(order)}
                                      className="h-8 px-2 flex items-center gap-1 text-xs"
                                      title="View Full Order Details"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-gray-600" />
                                      <span className="hidden sm:inline">Details</span>
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleReturnDetails(`${order._id}-${item._id}`)}
                                      className="h-8 w-8 p-0"
                                      title="Toggle details"
                                    >
                                      {expandedReturns.has(`${order._id}-${item._id}`) ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                      }
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {expandedReturns.has(`${order._id}-${item._id}`) && (
                                <TableRow>
                                  <TableCell colSpan={7} className="bg-gray-50/70 p-4 border-b">
                                    <ReturnOrderDetailsView order={order} handleReturnAction={handleReturnAction} />
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                        No return requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>

                    {[...Array(totalPages)].map((_, index) => (
                      <PaginationItem key={index + 1}>
                        <PaginationLink
                          onClick={() => handlePageChange(index + 1)}
                          isActive={currentPage === index + 1}
                        >
                          {index + 1}
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for Full Order Details */}
      <Dialog open={!!selectedModalOrder} onOpenChange={(open) => !open && setSelectedModalOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Complete Order & Return Details
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedModalOrder && (
              <ReturnOrderDetailsView order={selectedModalOrder} handleReturnAction={handleReturnAction} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}