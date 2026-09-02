import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Package, 
  CreditCard, 
  User, 
  MapPin, 
  Tag, 
  Calendar
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/Table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/Dialog";
import { fetchOrdersApi, updateOrderStatusApi } from '../../services/api/adminApis/orderApi';

function OrderDetailsView({ order, onStatusChange }) {
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

  return (
    <div className="space-y-6 text-sm">
      {/* Top Banner: Status & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 border rounded-lg">
        <div className="space-y-1">
          <span className="text-xs text-gray-500 uppercase font-semibold">Order Reference</span>
          <h3 className="text-lg font-bold text-gray-900">{order.orderId}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Placed on: {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Order Status</span>
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
              order.orderStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
              order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
              order.orderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {order.orderStatus}
            </span>
          </div>
          {onStatusChange && (
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase font-semibold block mb-0.5">Update Status</span>
              <Select
                defaultValue={order.orderStatus}
                onValueChange={(val) => onStatusChange(order._id, val)}
                disabled={order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered'}
              >
                <SelectTrigger className="w-[140px] bg-white h-8 text-xs">
                  <SelectValue>{order.orderStatus}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
            <span>Ordered Items ({order.items?.length || 0})</span>
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
                          {item.cancellationReason && (
                            <p className="text-xs text-red-600 italic mt-0.5">Cancel Reason: {item.cancellationReason}</p>
                          )}
                          {item.returnReason && (
                            <p className="text-xs text-orange-600 italic mt-0.5">Return Reason: {item.returnReason}</p>
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

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(4);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('filter') || 'all');
  const [sortField, setSortField] = useState(searchParams.get('sort') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'desc');

  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [selectedModalOrder, setSelectedModalOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', itemsPerPage.toString());
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (filterStatus !== 'all') {
        params.set('filter', filterStatus);
      }
      params.set('sort', sortField);
      params.set('order', sortOrder);

      setSearchParams(params);

      const response = await fetchOrdersApi(params);

      setOrders(response.data.orders);
      setTotalPages(response.data.pagination.totalPages);

      if (selectedModalOrder) {
        const updated = response.data.orders.find(o => o._id === selectedModalOrder._id);
        if (updated) setSelectedModalOrder(updated);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    params.set('search', searchQuery);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleFilterChange = (newStatus) => {
    setFilterStatus(newStatus);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    params.set('filter', newStatus);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSort = (field) => {
    const newOrder = field === sortField && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    const params = new URLSearchParams(searchParams);
    params.set('sort', field);
    params.set('order', newOrder);
    setSearchParams(params);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatusApi(orderId, newStatus);
      fetchOrders();
      toast.success('Order status updated successfully');
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrders(prev => {
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
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Orders Management</CardTitle>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search orders by ID or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <Button 
                    type="submit"
                    variant="ghost" 
                    className="absolute right-0 top-0 h-full px-3"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              <Select value={filterStatus} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading orders...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('orderId')}
                    >
                      Order ID
                      {sortField === 'orderId' && (
                        sortOrder === 'asc' ? <ChevronUp className="inline ml-1" /> : <ChevronDown className="inline ml-1" />
                      )}
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <React.Fragment key={order._id}>
                        <TableRow className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-mono font-medium text-gray-900">{order.orderId}</TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const u = order.user;
                              const nameFromUser = u ? (u.firstname ? `${u.firstname} ${u.lastname || ''}`.trim() : (u.name || u.fullName || '')) : '';
                              const nameFromShipping = order.shipping?.address?.fullName || '';
                              return nameFromUser || nameFromShipping || 'N/A';
                            })()}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 font-medium">
                            {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                          </TableCell>
                          <TableCell className="font-bold text-gray-900">₹{(order.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              order.orderStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
                              order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              order.orderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.orderStatus}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                defaultValue={order.orderStatus}
                                onValueChange={(value) => handleStatusChange(order._id, value)}
                                disabled={order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered'}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue>{order.orderStatus}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Processing">Processing</SelectItem>
                                  <SelectItem value="Shipped">Shipped</SelectItem>
                                  <SelectItem value="Delivered">Delivered</SelectItem>
                                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>

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
                                onClick={() => toggleOrderDetails(order._id)}
                                className="h-8 w-8 p-0"
                                title="Toggle details"
                              >
                                {expandedOrders.has(order._id) ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedOrders.has(order._id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-gray-50/70 p-4 border-b">
                              <OrderDetailsView order={order} onStatusChange={handleStatusChange} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                        No orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => {
                          const newPage = Math.max(currentPage - 1, 1);
                          setCurrentPage(newPage);
                          const params = new URLSearchParams(searchParams);
                          params.set('page', newPage.toString());
                          setSearchParams(params);
                        }}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, index) => (
                      <PaginationItem key={index + 1}>
                        <PaginationLink
                          onClick={() => {
                            setCurrentPage(index + 1);
                            const params = new URLSearchParams(searchParams);
                            params.set('page', (index + 1).toString());
                            setSearchParams(params);
                          }}
                          isActive={currentPage === index + 1}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          const newPage = Math.min(currentPage + 1, totalPages);
                          setCurrentPage(newPage);
                          const params = new URLSearchParams(searchParams);
                          params.set('page', newPage.toString());
                          setSearchParams(params);
                        }}
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
              Complete Order Details
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedModalOrder && (
              <OrderDetailsView order={selectedModalOrder} onStatusChange={handleStatusChange} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Orders;