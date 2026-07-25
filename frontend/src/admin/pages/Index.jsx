import React, { useState, useEffect } from 'react';
import { Layout } from '../layout/Layout';
import { StatsCard } from '../dashboard/StatsCard';
import { PieChartCard } from '../dashboard/PieChartCard';
import { BarChartCard } from '../dashboard/BarChartCard';
import { ShoppingBag, ShoppingCart, Clock, XCircle, Tag } from 'lucide-react';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../ui/Select";
import { DatePicker } from "../../ui/DatePicker";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../ui/Table";
import { Button } from "../../ui/Button";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "../../ui/pagination";
import { useSearchParams } from 'react-router-dom';
import { downloadSalesReportApi, fetchSalesDataApi } from '../../services/api/adminApis/indexApi';
import { set } from 'date-fns';


export default function Dashboard() {
    const [dateRange, setDateRange] = useState('monthly');
    const [customStartDate, setCustomStartDate] = useState(new Date());
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalReturns: 0,
        cancelledOrders: 0,
        totalDiscounts: 0
    });
    const [salesData, setSalesData] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(5);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

    const handleDownloadPDF = async () => {
        try {
            setIsDownloadingPdf(true);
            let params = {
                range: dateRange,
                format: 'pdf'
            };
            if (dateRange === 'custom') {
                params.startDate = customStartDate.toISOString();
                params.endDate = customEndDate.toISOString();
            }

            const response = await downloadSalesReportApi(params);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sales-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('PDF sales report downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download PDF report');
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleDownloadExcel = async () => {
        try {
            setIsDownloadingExcel(true);
            let params = {
                range: dateRange,
                format: 'excel'
            };
            if (dateRange === 'custom') {
                params.startDate = customStartDate.toISOString();
                params.endDate = customEndDate.toISOString();
            }

            const response = await downloadSalesReportApi(params);

            const url = window.URL.createObjectURL(
                new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                })
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sales-report-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Excel sales report downloaded successfully!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download Excel report');
        } finally {
            setIsDownloadingExcel(false);
        }
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        setSearchParams(params);
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                </Select>

                {dateRange === 'custom' && (
                    <div className="flex items-center gap-2">
                        <DatePicker
                            selected={customStartDate}
                            onChange={setCustomStartDate}
                            placeholderText="Start date"
                        />
                        <DatePicker
                            selected={customEndDate}
                            onChange={setCustomEndDate}
                            placeholderText="End date"
                        />
                    </div>
                )}

                <div className="flex gap-2 ml-auto">
                    <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        disabled={isDownloadingPdf}
                    >
                        {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleDownloadExcel}
                        disabled={isDownloadingExcel}
                    >
                        {isDownloadingExcel ? 'Downloading...' : 'Download Excel'}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <StatsCard
                            title="Total Revenue"
                            value={stats?.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : '₹0'}
                            icon={<ShoppingBag />}
                            color="blue"
                        />
                        <StatsCard
                            title="Total Orders"
                            value={stats.totalOrders || 0}
                            icon={<ShoppingCart />}
                            color="purple"
                        />
                        <StatsCard
                            title="Returned Orders"
                            value={stats.returnedOrders || 0}
                            icon={<Clock />}
                            color="yellow"
                        />
                        <StatsCard
                            title="Cancelled Orders"
                            value={stats.cancelledOrders || 0}
                            icon={<XCircle />}
                            color="red"
                        />
                        <StatsCard
                            title="Total Discounts"
                            value={stats?.totalDiscounts ? `₹${stats.totalDiscounts.toLocaleString()}` : '₹0'}
                            icon={<Tag />}
                            color="green"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 mb-6">
                        <BarChartCard
                            title="Sales Overview"
                            data={salesData}
                            className="h-[500px]"
                        />

                        <div className="grid grid-cols-3 gap-6 mt-7">
                            <PieChartCard
                                title="Top Categories by Revenue"
                                data={topCategories || []}
                                className="h-[550px]"
                            />
                            <PieChartCard
                                title="Top Products by Revenue"
                                data={topProducts || []}
                                className="h-[550px]"
                            />
                            <PieChartCard
                                title="Top Brands by Revenue"
                                data={topBrands || []}
                                className="h-[550px]"
                            />

                        </div>

                        <div className="grid grid-cols-3 gap-6 mt-7">
                            <div className="bg-white rounded-lg shadow p-6 overflow-auto max-h-[600px]">
                                <h2 className="text-xl font-semibold mb-4">Top Categories</h2>
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white">
                                        <TableRow>
                                            <TableHead>Category</TableHead>
                                            {/* <TableHead>Revenue</TableHead>
                                            <TableHead>Orders</TableHead> */}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topCategories.length > 0 ? (
                                            topCategories.map((category, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{category.name}</TableCell>
                                                    {/* <TableCell>₹{category.value.toLocaleString()}</TableCell> */}
                                                    {/* <TableCell>{category.orders}</TableCell> */}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center">No data available</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6 overflow-auto max-h-[600px]">
                                <h2 className="text-xl font-semibold mb-4">Top Products</h2>
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white">
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            {/* <TableHead>Revenue</TableHead> */}
                                            {/* <TableHead>Units Sold</TableHead> */}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topProducts.length > 0 ? (
                                            topProducts.map((product, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{product.name}</TableCell>
                                                    {/* <TableCell>₹{product.value.toLocaleString()}</TableCell> */}
                                                    {/* <TableCell>{product.quantity}</TableCell> */}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center">No data available</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6 overflow-auto max-h-[600px]">
                                <h2 className="text-xl font-semibold mb-4">Top Brands</h2>
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white">
                                        <TableRow>
                                            <TableHead>Brand</TableHead>
                                            {/* <TableHead>Revenue</TableHead>
                                            <TableHead>Market Share</TableHead> */}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topBrands.length > 0 ? (
                                            topBrands.map((brand, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{brand.name}</TableCell>
                                                    {/* <TableCell>₹{brand.value.toLocaleString()}</TableCell>
                                                    <TableCell>{brand.marketShare}%</TableCell> */}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center">No data available</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Financial Ledger</h2>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        {/* <TableHead>Transaction ID</TableHead> */}
                                        <TableHead>Description</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((transaction) => (
                                        <TableRow key={transaction._id}>
                                            <TableCell>
                                                {new Date(transaction.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            {/* <TableCell>{transaction._id}</TableCell> */}
                                            <TableCell>Order #{transaction.orderId}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 ${transaction.status === 'Cancelled'
                                                        ? 'bg-red-100 text-red-800'
                                                        : transaction.status === 'Returned' || transaction.status === 'Refunded'
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-green-100 text-green-800'
                                                    } rounded-full text-xs`}>
                                                    {transaction.status === 'Cancelled'
                                                        ? '—'
                                                        : transaction.status === 'Returned' || transaction.status === 'Refunded'
                                                            ? 'REFUND'
                                                            : 'CREDIT'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={
                                                    transaction.status === 'Cancelled' ||
                                                        transaction.status === 'Returned' ||
                                                        transaction.status === 'Refunded'
                                                        ? 'text-red-600'
                                                        : 'text-gray-900'
                                                }>
                                                    ₹{transaction.amount.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>{transaction.paymentMethod}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${transaction.status === 'Cancelled'
                                                        ? 'bg-red-100 text-red-800'
                                                        : transaction.status === 'Returned' || transaction.status === 'Refunded'
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : transaction.status === 'Delivered'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {transaction.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="mt-4 flex justify-center">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                                                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}