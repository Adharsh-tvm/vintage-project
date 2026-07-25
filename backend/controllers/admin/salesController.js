import Order from '../../models/product/orderModel.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { HttpStatus } from '../../utils/httpStatus.js';

export const getSalesReport = async (req, res) => {
    try {
        const { range, startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        let dateFilter = {};

        switch (range) {
            case 'daily':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateFilter = { createdAt: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } };
                break;
            case 'weekly':
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                dateFilter = { createdAt: { $gte: weekStart, $lt: new Date() } };
                break;
            case 'monthly':
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                dateFilter = { createdAt: { $gte: monthStart, $lt: new Date() } };
                break;
            case 'yearly':
                const yearStart = new Date(new Date().getFullYear(), 0, 1);
                dateFilter = { createdAt: { $gte: yearStart, $lt: new Date() } };
                break;
            case 'custom':
                dateFilter = { createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) } };
                break;
        }

        console.log('Query Parameters:', { range, startDate, endDate });
        console.log('Date Filter:', dateFilter);

        const totalOrders = await Order.countDocuments({});
        console.log('Total orders in database:', totalOrders);

        const ordersInRange = await Order.countDocuments(dateFilter);
        console.log('Orders in date range:', ordersInRange);

        const completedPayments = await Order.countDocuments({ ...dateFilter, 'payment.status': 'completed' });
        console.log('Completed payments in range:', completedPayments);

        const totalTransactions = await Order.countDocuments(dateFilter);

        const transactions = await Order.find(dateFilter)
            .select('orderId totalAmount payment createdAt orderStatus items.status items.returnStatus')
            .sort('-createdAt').skip(skip).limit(limit);

        const stats = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$orderStatus', 'Delivered'] },
                                { $sum: { $map: { input: '$items', as: 'item', in: { $cond: [{ $and: [{ $ne: ['$orderStatus', 'Cancelled'] }, { $ne: ['$$item.status', 'Returned'] }] }, '$totalAmount', 0] } } } },
                                0
                            ]
                        }
                    },
                    totalOrders: { $sum: 1 },
                    returnedOrders: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'Returned'] } } } }, 0] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] } },
                    totalDiscounts: {
                        $sum: {
                            $cond: [
                                { $and: [{ $ne: ['$orderStatus', 'Cancelled'] }, { $not: { $gt: [{ $size: { $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'Returned'] } } } }, 0] } }] },
                                { $reduce: { input: '$items', initialValue: 0, in: { $add: ['$$value', { $subtract: [{ $multiply: ['$$this.price', '$$this.quantity'] }, '$$this.finalPrice'] }] } } },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        console.log('Aggregation Results:', stats);

        const salesData = await Order.aggregate([
            { $match: { ...dateFilter, orderStatus: 'Delivered' } },
            { $project: { createdAt: 1, items: { $filter: { input: '$items', as: 'item', cond: { $ne: ['$$item.status', 'Returned'] } } }, payment: 1 } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, sales: { $sum: { $reduce: { input: '$items', initialValue: 0, in: { $add: ['$$value', '$$this.finalPrice'] } } } }, orders: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
        ]);

        const topProducts = await Order.aggregate([
            { $match: dateFilter }, { $unwind: '$items' },
            { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.finalPrice' } } },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
            { $unwind: '$productInfo' },
            { $project: { name: '$productInfo.name', totalSold: 1, revenue: 1 } },
            { $sort: { revenue: -1 } }, { $limit: 10 }
        ]);

        const topCategories = await Order.aggregate([
            { $match: dateFilter }, { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
            { $unwind: '$productInfo' },
            { $group: { _id: '$productInfo.category', revenue: { $sum: '$items.finalPrice' } } },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryInfo' } },
            { $unwind: '$categoryInfo' },
            { $project: { name: '$categoryInfo.name', revenue: 1 } },
            { $sort: { revenue: -1 } }, { $limit: 10 }
        ]);

        const topBrands = await Order.aggregate([
            { $match: dateFilter }, { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
            { $unwind: '$productInfo' },
            { $group: { _id: '$productInfo.brand', revenue: { $sum: '$items.finalPrice' } } },
            { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brandInfo' } },
            { $unwind: '$brandInfo' },
            { $project: { name: '$brandInfo.name', revenue: 1 } },
            { $sort: { revenue: -1 } }, { $limit: 10 }
        ]);

        const totalProductsRevenue  = topProducts.reduce((sum, p) => sum + p.revenue, 0);
        const totalCategoriesRevenue = topCategories.reduce((sum, c) => sum + c.revenue, 0);
        const totalBrandsRevenue     = topBrands.reduce((sum, b) => sum + b.revenue, 0);

        res.status(HttpStatus.OK).json({
            stats: stats[0] || { totalRevenue: 0, totalOrders: 0, returnedOrders: 0, cancelledOrders: 0, totalDiscounts: 0 },
            salesData: salesData.map(item => ({ date: item._id, sales: item.sales, orders: item.orders })),
            transactions: transactions.map(t => ({
                _id: t._id,
                orderId: t.orderId,
                amount: t.totalAmount,
                paymentMethod: t.payment.method,
                status: t.items.some(item => item.status === 'Returned' || item.returnStatus === 'Refunded' || item.returnStatus === 'Return Approved') ? 'Returned' : t.orderStatus,
                createdAt: t.createdAt
            })),
            pagination: { currentPage: page, totalPages: Math.ceil(totalTransactions / limit), totalItems: totalTransactions, itemsPerPage: limit, hasNextPage: skip + limit < totalTransactions, hasPrevPage: page > 1 },
            topProducts:   topProducts.map(p => ({ name: p.name, value: Math.round((p.revenue / totalProductsRevenue) * 100), color: `#${Math.floor(Math.random() * 16777215).toString(16)}` })),
            topCategories: topCategories.map(c => ({ name: c.name, value: Math.round((c.revenue / totalCategoriesRevenue) * 100), color: `#${Math.floor(Math.random() * 16777215).toString(16)}` })),
            topBrands:     topBrands.map(b => ({ name: b.name, value: Math.round((b.revenue / totalBrandsRevenue) * 100), color: `#${Math.floor(Math.random() * 16777215).toString(16)}` }))
        });

    } catch (error) {
        console.error('Error in getSalesReport:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to generate sales report' });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD SALES REPORT  (Premium 4-page PDF)
// ─────────────────────────────────────────────────────────────────────────────
export const downloadSalesReport = async (req, res) => {
    try {
        const { range, startDate, endDate, format } = req.query;
        let dateFilter = {};

        switch (range) {
            case 'daily':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateFilter = { createdAt: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } };
                break;
            case 'weekly':
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                dateFilter = { createdAt: { $gte: weekStart, $lt: new Date() } };
                break;
            case 'monthly':
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);
                dateFilter = { createdAt: { $gte: monthStart, $lt: new Date() } };
                break;
            case 'yearly':
                const yearStart = new Date(new Date().getFullYear(), 0, 1);
                dateFilter = { createdAt: { $gte: yearStart, $lt: new Date() } };
                break;
            case 'custom':
                dateFilter = { createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) } };
                break;
        }

        // ── Fetch all data ──────────────────────────────────────────────────────
        const statsAgg = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$orderStatus', 'Delivered'] },
                                { $sum: { $map: { input: '$items', as: 'item', in: { $cond: [{ $and: [{ $ne: ['$orderStatus', 'Cancelled'] }, { $ne: ['$$item.status', 'Returned'] }] }, '$totalAmount', 0] } } } },
                                0
                            ]
                        }
                    },
                    totalOrders: { $sum: 1 },
                    returnedOrders: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'Returned'] } } } }, 0] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] } },
                    totalDiscounts: {
                        $sum: {
                            $cond: [
                                { $and: [{ $ne: ['$orderStatus', 'Cancelled'] }, { $not: { $gt: [{ $size: { $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.status', 'Returned'] } } } }, 0] } }] },
                                { $reduce: { input: '$items', initialValue: 0, in: { $add: ['$$value', { $subtract: [{ $multiply: ['$$this.price', '$$this.quantity'] }, '$$this.finalPrice'] }] } } },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const topProducts = await Order.aggregate([
            { $match: dateFilter }, { $unwind: '$items' },
            { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.finalPrice' } } },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'info' } },
            { $unwind: '$info' },
            { $project: { name: '$info.name', totalSold: 1, revenue: 1 } },
            { $sort: { revenue: -1 } }, { $limit: 10 }
        ]);

        const topCategories = await Order.aggregate([
            { $match: dateFilter }, { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'pInfo' } },
            { $unwind: '$pInfo' },
            { $group: { _id: '$pInfo.category', revenue: { $sum: '$items.finalPrice' }, unitsSold: { $sum: '$items.quantity' } } },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cInfo' } },
            { $unwind: '$cInfo' },
            { $project: { name: '$cInfo.name', revenue: 1, unitsSold: 1 } },
            { $sort: { revenue: -1 } }, { $limit: 8 }
        ]);

        const topBrands = await Order.aggregate([
            { $match: dateFilter }, { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'pInfo' } },
            { $unwind: '$pInfo' },
            { $group: { _id: '$pInfo.brand', revenue: { $sum: '$items.finalPrice' }, unitsSold: { $sum: '$items.quantity' } } },
            { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'bInfo' } },
            { $unwind: '$bInfo' },
            { $project: { name: '$bInfo.name', revenue: 1, unitsSold: 1 } },
            { $sort: { revenue: -1 } }, { $limit: 8 }
        ]);

        const salesByDay = await Order.aggregate([
            { $match: { ...dateFilter, orderStatus: 'Delivered' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, sales: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
            { $sort: { _id: 1 } }, { $limit: 30 }
        ]);

        const recentOrders = await Order.find(dateFilter)
            .select('orderId totalAmount payment createdAt orderStatus')
            .sort('-createdAt').limit(20);

        const s = statsAgg[0] || { totalRevenue: 0, totalOrders: 0, returnedOrders: 0, cancelledOrders: 0, totalDiscounts: 0 };

        // ══════════════════════════════════════════════════════════════════════════
        // EXCEL GENERATION BRANCH
        // ══════════════════════════════════════════════════════════════════════════
        if (format === 'excel' || format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Vintage Store';
            workbook.created = new Date();

            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };
            const headerFont = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            const titleFont  = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF0D1B2A' } };

            // 1. Executive Summary Sheet
            const summaryWs = workbook.addWorksheet('Executive Summary');
            summaryWs.views = [{ showGridLines: true }];

            summaryWs.addRow(['VINTAGE - SALES REPORT SUMMARY']);
            summaryWs.getRow(1).font = titleFont;
            summaryWs.addRow([`Period: ${range || 'monthly'} | Generated: ${new Date().toLocaleString()}`]);
            summaryWs.addRow([]);

            const sumHeaderRow = summaryWs.addRow(['Metric', 'Value', 'Description']);
            sumHeaderRow.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });

            const activeOrders = (s.totalOrders || 0) - (s.returnedOrders || 0) - (s.cancelledOrders || 0);
            const avgOrderVal  = s.totalOrders > 0 ? Math.round(s.totalRevenue / s.totalOrders) : 0;

            const summaryData = [
                ['Total Gross Revenue (Delivered)', s.totalRevenue || 0, 'Delivered, non-returned items'],
                ['Total Orders Placed', s.totalOrders || 0, 'All order statuses'],
                ['Successful / Active Orders', activeOrders, 'Total minus Returned & Cancelled'],
                ['Returned Orders', s.returnedOrders || 0, 'At least 1 item returned'],
                ['Cancelled Orders', s.cancelledOrders || 0, 'Orders fully cancelled'],
                ['Total Discount Savings', s.totalDiscounts || 0, 'Coupons and promotional savings'],
                ['Average Order Value (AOV)', avgOrderVal, 'Revenue / Total Orders'],
            ];

            summaryData.forEach(r => {
                const row = summaryWs.addRow(r);
                if (typeof r[1] === 'number') {
                    row.getCell(2).numberFormat = r[0].includes('Orders') ? '#,##0' : 'Rs. #,##0';
                }
            });
            summaryWs.columns = [{ width: 35 }, { width: 20 }, { width: 45 }];

            // 2. Top Products Sheet
            const prodWs = workbook.addWorksheet('Top Products');
            prodWs.views = [{ showGridLines: true }];
            const prodHeader = prodWs.addRow(['Rank', 'Product Name', 'Units Sold', 'Revenue (Rs.)', 'Share (%)']);
            prodHeader.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });
            const prodTotalRev = topProducts.reduce((acc, p) => acc + p.revenue, 0);
            topProducts.forEach((p, i) => {
                const share = prodTotalRev > 0 ? Number(((p.revenue / prodTotalRev) * 100).toFixed(1)) : 0;
                const row = prodWs.addRow([i + 1, p.name, p.totalSold, p.revenue, share]);
                row.getCell(4).numberFormat = 'Rs. #,##0';
                row.getCell(5).numberFormat = '0.0"%"';
            });
            prodWs.columns = [{ width: 10 }, { width: 40 }, { width: 15 }, { width: 20 }, { width: 15 }];

            // 3. Top Categories Sheet
            const catWs = workbook.addWorksheet('Top Categories');
            catWs.views = [{ showGridLines: true }];
            const catHeader = catWs.addRow(['Rank', 'Category Name', 'Units Sold', 'Revenue (Rs.)', 'Share (%)']);
            catHeader.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });
            const catTotalRev = topCategories.reduce((acc, c) => acc + c.revenue, 0);
            topCategories.forEach((c, i) => {
                const share = catTotalRev > 0 ? Number(((c.revenue / catTotalRev) * 100).toFixed(1)) : 0;
                const row = catWs.addRow([i + 1, c.name, c.unitsSold || 0, c.revenue, share]);
                row.getCell(4).numberFormat = 'Rs. #,##0';
                row.getCell(5).numberFormat = '0.0"%"';
            });
            catWs.columns = [{ width: 10 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 15 }];

            // 4. Top Brands Sheet
            const brandWs = workbook.addWorksheet('Top Brands');
            brandWs.views = [{ showGridLines: true }];
            const brandHeader = brandWs.addRow(['Rank', 'Brand Name', 'Units Sold', 'Revenue (Rs.)', 'Share (%)']);
            brandHeader.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });
            const brandTotalRev = topBrands.reduce((acc, b) => acc + b.revenue, 0);
            topBrands.forEach((b, i) => {
                const share = brandTotalRev > 0 ? Number(((b.revenue / brandTotalRev) * 100).toFixed(1)) : 0;
                const row = brandWs.addRow([i + 1, b.name, b.unitsSold || 0, b.revenue, share]);
                row.getCell(4).numberFormat = 'Rs. #,##0';
                row.getCell(5).numberFormat = '0.0"%"';
            });
            brandWs.columns = [{ width: 10 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 15 }];

            // 5. Transaction Ledger Sheet
            const txWs = workbook.addWorksheet('Transaction Ledger');
            txWs.views = [{ showGridLines: true }];
            const txHeader = txWs.addRow(['Date', 'Order ID', 'Amount (Rs.)', 'Payment Method', 'Status']);
            txHeader.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; });
            recentOrders.forEach((t) => {
                const row = txWs.addRow([
                    new Date(t.createdAt).toLocaleDateString('en-IN'),
                    `#${t.orderId}`,
                    t.totalAmount,
                    t.payment && t.payment.method ? t.payment.method : 'N/A',
                    t.orderStatus
                ]);
                row.getCell(3).numberFormat = 'Rs. #,##0';
            });
            txWs.columns = [{ width: 15 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="sales-report-${range || 'report'}-${new Date().toISOString().split('T')[0]}.xlsx"`);

            await workbook.xlsx.write(res);
            return res.end();
        }

        // ══════════════════════════════════════════════════════════════════════════
        // PDF GENERATION BRANCH
        // ══════════════════════════════════════════════════════════════════════════
        const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
        const filename = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);

        const PW = doc.page.width;   // 595.28
        const PH = doc.page.height;  // 841.89
        const M  = 40;
        const CW = PW - M * 2;

        // ── Colour Palette ──────────────────────────────────────────────────────
        const C = {
            navy:    '#0D1B2A', navy2:   '#1E293B',
            indigo:  '#4F46E5', ind2:    '#6366F1', iLight: '#A5B4FC',
            violet:  '#7C3AED', teal:    '#0D9488',
            rose:    '#F43F5E', amber:   '#F59E0B', emerald: '#10B981',
            s6: '#475569', s5: '#64748B', s4: '#94A3B8',
            s3: '#CBD5E1', s2: '#E2E8F0', s1: '#F1F5F9', s0: '#F8FAFC',
            white: '#FFFFFF', black: '#0F172A',
        };

        const fmt = (n) => `Rs.${(n || 0).toLocaleString('en-IN')}`;
        const periodLabel = range.charAt(0).toUpperCase() + range.slice(1);
        const generatedOn = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

        // ── Helper: page header ─────────────────────────────────────────────────
        const pageHeader = (title) => {
            doc.rect(0, 0, PW, 52).fill(C.navy);
            doc.rect(0, 52, PW, 3).fill(C.indigo);
            doc.fillColor(C.iLight).font('Helvetica-Bold').fontSize(8).text('VINTAGE', M, 15, { characterSpacing: 2 });
            doc.fillColor(C.white).font('Helvetica-Bold').fontSize(17).text(title, M, 27);
            doc.fillColor(C.s4).font('Helvetica').fontSize(7.5).text(generatedOn, 0, 38, { align: 'right', width: PW - M });
        };

        // ── Helper: page footer ─────────────────────────────────────────────────
        const pageFooter = (pageNum, total) => {
            doc.rect(0, PH - 30, PW, 30).fill(C.navy);
            doc.rect(0, PH - 30, PW, 1.5).fill(C.indigo);
            doc.fillColor(C.s4).font('Helvetica').fontSize(7.5).text('Vintage  —  Confidential Sales Report', M, PH - 18, { lineBreak: false });
            doc.fillColor(C.s4).font('Helvetica').fontSize(7.5).text(`Page ${pageNum} of ${total}`, 0, PH - 18, { align: 'right', width: PW - M, lineBreak: false });
        };

        // ── Helper: KPI card ────────────────────────────────────────────────────
        const kpiCard = (x, y, w, h, color, label, value, sub) => {
            doc.save();
            doc.fillColor('#AAAAAA').fillOpacity(0.18).roundedRect(x + 2, y + 3, w, h, 7).fill();
            doc.restore();
            doc.roundedRect(x, y, w, h, 7).fill(C.white);
            doc.roundedRect(x, y, w, 4, 3).fill(color);
            doc.save();
            doc.fillColor(color).fillOpacity(0.10).circle(x + w - 20, y + h - 20, 22).fill();
            doc.restore();
            doc.save();
            doc.fillColor(color).fillOpacity(0.20).circle(x + w - 20, y + h - 20, 13).fill();
            doc.restore();
            doc.fillColor(C.s5).font('Helvetica').fontSize(7.5).text(label, x + 10, y + 14, { width: w - 20, lineBreak: false });
            doc.fillColor(C.black).font('Helvetica-Bold').fontSize(17).text(value, x + 10, y + 26, { width: w - 32, lineBreak: false });
            if (sub) doc.fillColor(color).font('Helvetica').fontSize(7).text(sub, x + 10, y + h - 16, { width: w - 20, lineBreak: false });
        };

        // ── Helper: section heading ─────────────────────────────────────────────
        const sHead = (title, y, sub) => {
            doc.rect(M, y, 4, 18).fill(C.indigo);
            doc.fillColor(C.black).font('Helvetica-Bold').fontSize(12).text(title, M + 12, y + 1);
            if (sub) doc.fillColor(C.s5).font('Helvetica').fontSize(8).text(sub, M + 12, y + 16);
            const lineY = y + (sub ? 30 : 22);
            doc.moveTo(M, lineY).lineTo(PW - M, lineY).strokeColor(C.s2).lineWidth(1).stroke();
            return lineY + 8;
        };

        // ── Helper: styled table ────────────────────────────────────────────────
        const drawTable = (cols, rows, startY, opts) => {
            const RH = (opts && opts.rowHeight) || 24;
            const HH = 28;
            const TW = cols.reduce((acc, c) => acc + c.w, 0);
            doc.save();
            doc.fillColor('#BBBBBB').fillOpacity(0.15).rect(M + 2, startY + 2, TW, HH + rows.length * RH).fill();
            doc.restore();
            doc.rect(M, startY, TW, HH).fill(C.navy);
            let hx = M;
            cols.forEach((col) => {
                doc.fillColor(C.iLight).font('Helvetica-Bold').fontSize(8)
                   .text(col.label, hx + 7, startY + (HH - 8) / 2, { width: col.w - 14, align: col.align || 'left', lineBreak: false });
                hx += col.w;
            });
            let ry = startY + HH;
            rows.forEach((row, ri) => {
                doc.rect(M, ry, TW, RH).fill(ri % 2 === 0 ? C.s0 : C.white);
                doc.rect(M, ry, 3, RH).fill(ri % 2 === 0 ? C.ind2 : C.s3);
                let rx = M;
                cols.forEach((col) => {
                    const val = row[col.key] !== undefined ? String(row[col.key]) : '';
                    doc.fillColor(col.highlight ? C.indigo : C.black)
                       .font(col.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
                       .text(val, rx + 7, ry + (RH - 8.5) / 2, { width: col.w - 14, align: col.align || 'left', lineBreak: false });
                    rx += col.w;
                });
                doc.moveTo(M, ry + RH).lineTo(M + TW, ry + RH).strokeColor(C.s2).lineWidth(0.5).stroke();
                ry += RH;
            });
            doc.rect(M, startY, TW, HH + rows.length * RH).strokeColor(C.s3).lineWidth(0.5).stroke();
            return ry;
        };

        // ── Helper: bar chart ───────────────────────────────────────────────────
        const drawBarChart = (data, cx, cy, cw, ch) => {
            if (!data || data.length === 0) {
                doc.fillColor(C.s4).font('Helvetica').fontSize(9).text('No chart data available for this period.', cx, cy + ch / 2, { width: cw, align: 'center' });
                return;
            }
            const maxV     = Math.max(...data.map(d => d.v), 1);
            const barArea  = ch - 22;
            const count    = Math.min(data.length, 25);
            const bw       = Math.max(4, Math.floor((cw - 2) / count) - 2);

            [0.25, 0.5, 0.75, 1.0].forEach((pct) => {
                const gy = cy + barArea * (1 - pct);
                doc.moveTo(cx, gy).lineTo(cx + cw, gy).strokeColor(C.s2).lineWidth(0.5).stroke();
                doc.fillColor(C.s4).font('Helvetica').fontSize(6)
                   .text(Math.round(maxV * pct).toLocaleString('en-IN'), cx - 38, gy - 4, { width: 36, align: 'right', lineBreak: false });
            });

            data.slice(0, count).forEach((item, i) => {
                const bx = cx + i * (bw + 2);
                const bh = Math.round((item.v / maxV) * barArea);
                if (bh > 0) {
                    doc.rect(bx, cy + barArea - bh, bw, bh).fill(C.ind2);
                    doc.save();
                    doc.fillColor(C.iLight).fillOpacity(0.35).rect(bx, cy + barArea - bh, bw, Math.min(bh, 5)).fill();
                    doc.restore();
                }
                if (item.l) {
                    doc.fillColor(C.s5).font('Helvetica').fontSize(5.5)
                       .text(item.l, bx - 2, cy + barArea + 5, { width: bw + 4, align: 'center', lineBreak: false });
                }
            });

            doc.moveTo(cx, cy).lineTo(cx, cy + barArea + 1).strokeColor(C.s4).lineWidth(0.8).stroke();
            doc.moveTo(cx, cy + barArea).lineTo(cx + cw, cy + barArea).strokeColor(C.s4).lineWidth(0.8).stroke();
        };

        // ══════════════════════════════════════════════════════════════════════════
        // PAGE 1  —  COVER
        // ══════════════════════════════════════════════════════════════════════════
        doc.rect(0, 0, PW, PH).fill(C.navy);
        doc.save(); doc.fillColor(C.indigo).fillOpacity(0.18).circle(PW + 10, -20, 230).fill(); doc.restore();
        doc.save(); doc.fillColor(C.violet).fillOpacity(0.10).circle(PW - 40, 110, 170).fill(); doc.restore();
        doc.save(); doc.fillColor(C.teal).fillOpacity(0.08).circle(-40, PH - 80, 200).fill(); doc.restore();
        doc.save(); doc.fillColor(C.ind2).fillOpacity(0.06).circle(130, PH - 30, 180).fill(); doc.restore();

        doc.rect(0, 0, PW, 5).fill(C.indigo);
        doc.rect(M, 76, 4, 200).fill(C.indigo);

        doc.fillColor(C.iLight).font('Helvetica-Bold').fontSize(11).text('V I N T A G E', M + 18, 82, { characterSpacing: 4 });
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(58).text('SALES', M + 18, 112);
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(58).text('REPORT', M + 18, 174);

        doc.roundedRect(M + 18, 244, 114, 28, 5).fill(C.indigo);
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11).text(periodLabel.toUpperCase(), M + 18, 250, { width: 114, align: 'center' });
        doc.fillColor(C.s4).font('Helvetica').fontSize(9).text(`Generated: ${generatedOn}`, M + 18, 282);

        doc.rect(M, 308, CW, 1).fill(C.navy2);
        doc.fillColor(C.iLight).font('Helvetica-Bold').fontSize(8.5).text('KEY METRICS OVERVIEW', M + 18, 324, { characterSpacing: 1.5 });

        const covStats = [
            { l: 'Total Revenue',    v: fmt(s.totalRevenue),           c: C.emerald },
            { l: 'Total Orders',     v: String(s.totalOrders || 0),    c: C.ind2    },
            { l: 'Returned',         v: String(s.returnedOrders || 0), c: C.amber   },
            { l: 'Cancelled',        v: String(s.cancelledOrders || 0),c: C.rose    },
        ];
        const covW = (CW - 18) / 4;
        covStats.forEach((cs, i) => {
            const bx = M + i * (covW + 6), by = 346;
            doc.roundedRect(bx, by, covW, 68, 6).fill(C.navy2);
            doc.rect(bx, by, covW, 3).fill(cs.c);
            doc.fillColor(C.s4).font('Helvetica').fontSize(7.5).text(cs.l, bx + 10, by + 12, { width: covW - 20, lineBreak: false });
            doc.fillColor(C.white).font('Helvetica-Bold').fontSize(17).text(cs.v, bx + 10, by + 28, { width: covW - 20, lineBreak: false });
        });

        doc.roundedRect(M, 426, CW, 42, 6).fill(C.navy2);
        doc.rect(M, 426, CW, 3).fill(C.teal);
        doc.fillColor(C.s4).font('Helvetica').fontSize(8).text('Total Discounts Given', M + 14, 438, { lineBreak: false });
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(18).text(fmt(s.totalDiscounts), 0, 438, { align: 'right', width: PW - M - 14, lineBreak: false });

        doc.save();
        doc.fillColor(C.navy2).font('Helvetica-Bold').fontSize(120).text(new Date().getFullYear().toString(), M, PH - 250, { lineBreak: false });
        doc.restore();

        doc.rect(0, PH - 72, PW, 72).fill(C.navy2);
        doc.rect(0, PH - 72, PW, 2).fill(C.indigo);
        doc.fillColor(C.s4).font('Helvetica').fontSize(8)
           .text('This report is confidential and intended for authorised Vintage personnel only.', M, PH - 52, { width: CW * 0.65 });
        doc.fillColor(C.iLight).font('Helvetica-Bold').fontSize(11).text('vintage.in', 0, PH - 36, { align: 'right', width: PW - M });

        // ══════════════════════════════════════════════════════════════════════════
        // PAGE 2  —  EXECUTIVE SUMMARY
        // ══════════════════════════════════════════════════════════════════════════
        doc.addPage();
        doc.rect(0, 0, PW, PH).fill(C.white);
        pageHeader('Executive Summary');

        let Y2 = 68;

        const kpis = [
            { label: 'Total Revenue',    value: fmt(s.totalRevenue),           sub: 'Net delivered revenue',     color: C.emerald },
            { label: 'Total Orders',     value: String(s.totalOrders || 0),    sub: 'All orders in period',      color: C.indigo  },
            { label: 'Returned Orders',  value: String(s.returnedOrders || 0), sub: 'Items marked returned',     color: C.amber   },
            { label: 'Cancelled Orders', value: String(s.cancelledOrders || 0),sub: 'Orders fully cancelled',    color: C.rose    },
            { label: 'Total Discounts',  value: fmt(s.totalDiscounts),         sub: 'Coupon & offer savings',    color: C.teal    },
        ];
        const kW = (CW - 16) / 5, kH = 80;
        kpis.forEach((kpi, i) => {
            kpiCard(M + i * (kW + 4), Y2, kW, kH, kpi.color, kpi.label, kpi.value, kpi.sub);
        });
        Y2 += kH + 24;

        if (salesByDay.length > 0) {
            Y2 = sHead('Revenue Trend', Y2, 'Daily delivered revenue for the selected period');
            const CHT_H = 130;
            doc.roundedRect(M, Y2, CW, CHT_H + 46, 8).fill(C.s0);
            doc.roundedRect(M, Y2, CW, CHT_H + 46, 8).strokeColor(C.s2).lineWidth(0.5).stroke();
            drawBarChart(salesByDay.map(d => ({ v: d.sales, l: d._id.slice(5) })), M + 50, Y2 + 14, CW - 54, CHT_H);
            Y2 += CHT_H + 62;
        }

        Y2 = sHead('Performance Summary', Y2);
        const activeOrders = (s.totalOrders || 0) - (s.returnedOrders || 0) - (s.cancelledOrders || 0);
        const avgOrderVal  = s.totalOrders > 0 ? Math.round(s.totalRevenue / s.totalOrders) : 0;
        const sumCols = [
            { label: 'Metric',      key: 'metric', w: 220 },
            { label: 'Value',       key: 'value',  w: 130, align: 'right', highlight: true },
            { label: 'Description', key: 'note',   w: CW - 350 },
        ];
        const sumRows = [
            { metric: 'Gross Revenue (Delivered)', value: fmt(s.totalRevenue),       note: 'From delivered & non-returned orders' },
            { metric: 'Total Orders Placed',       value: s.totalOrders || 0,        note: 'All order statuses included' },
            { metric: 'Successful Orders',         value: activeOrders,               note: 'Total minus Returned minus Cancelled' },
            { metric: 'Returned Orders',           value: s.returnedOrders || 0,     note: 'At least one item returned' },
            { metric: 'Cancelled Orders',          value: s.cancelledOrders || 0,    note: 'Full order was cancelled' },
            { metric: 'Total Discount Given',      value: fmt(s.totalDiscounts),     note: 'Savings via coupons & offers' },
            { metric: 'Average Order Value',       value: fmt(avgOrderVal),           note: 'Revenue divided by total orders' },
        ];
        Y2 = drawTable(sumCols, sumRows, Y2);

        // ══════════════════════════════════════════════════════════════════════════
        // PAGE 3  —  PRODUCTS, CATEGORIES & BRANDS
        // ══════════════════════════════════════════════════════════════════════════
        doc.addPage();
        doc.rect(0, 0, PW, PH).fill(C.white);
        pageHeader('Products, Categories & Brands');

        let Y3 = 68;

        Y3 = sHead('Top Performing Products', Y3, `Ranked by revenue  —  ${periodLabel} period`);
        const prodTotalRev = topProducts.reduce((acc, p) => acc + p.revenue, 0);
        const prodCols = [
            { label: '#',        key: 'rank',    w: 28,                          align: 'center', bold: true },
            { label: 'Product',  key: 'name',    w: CW - 28 - 80 - 100 - 70 },
            { label: 'Units',    key: 'units',   w: 80,                          align: 'right' },
            { label: 'Revenue',  key: 'revenue', w: 100,                         align: 'right', highlight: true },
            { label: '% Share',  key: 'share',   w: 70,                          align: 'right' },
        ];
        const prodRows = topProducts.map((p, i) => ({
            rank: i + 1, name: p.name, units: p.totalSold,
            revenue: fmt(p.revenue),
            share: prodTotalRev > 0 ? ((p.revenue / prodTotalRev) * 100).toFixed(1) + '%' : '0%',
        }));
        Y3 = drawTable(prodCols, prodRows, Y3);
        Y3 += 22;

        Y3 = sHead('Top Categories by Revenue', Y3);
        const catTotalRev = topCategories.reduce((acc, c) => acc + c.revenue, 0);
        const catCols = [
            { label: '#',        key: 'rank',    w: 28,                          align: 'center', bold: true },
            { label: 'Category', key: 'name',    w: CW - 28 - 80 - 100 - 70 },
            { label: 'Units',    key: 'units',   w: 80,                          align: 'right' },
            { label: 'Revenue',  key: 'revenue', w: 100,                         align: 'right', highlight: true },
            { label: '% Share',  key: 'share',   w: 70,                          align: 'right' },
        ];
        const catRows = topCategories.map((c, i) => ({
            rank: i + 1, name: c.name, units: c.unitsSold || 0,
            revenue: fmt(c.revenue),
            share: catTotalRev > 0 ? ((c.revenue / catTotalRev) * 100).toFixed(1) + '%' : '0%',
        }));
        Y3 = drawTable(catCols, catRows, Y3);
        Y3 += 22;

        if (Y3 + 220 < PH - 60) {
            Y3 = sHead('Top Brands by Revenue', Y3);
            const brandTotalRev = topBrands.reduce((acc, b) => acc + b.revenue, 0);
            const brandCols = [
                { label: '#',       key: 'rank',    w: 28,                          align: 'center', bold: true },
                { label: 'Brand',   key: 'name',    w: CW - 28 - 80 - 100 - 70 },
                { label: 'Units',   key: 'units',   w: 80,                          align: 'right' },
                { label: 'Revenue', key: 'revenue', w: 100,                         align: 'right', highlight: true },
                { label: '% Share', key: 'share',   w: 70,                          align: 'right' },
            ];
            const brandRows = topBrands.map((b, i) => ({
                rank: i + 1, name: b.name, units: b.unitsSold || 0,
                revenue: fmt(b.revenue),
                share: brandTotalRev > 0 ? ((b.revenue / brandTotalRev) * 100).toFixed(1) + '%' : '0%',
            }));
            Y3 = drawTable(brandCols, brandRows, Y3);
        }

        // ══════════════════════════════════════════════════════════════════════════
        // PAGE 4  —  TRANSACTION LEDGER
        // ══════════════════════════════════════════════════════════════════════════
        doc.addPage();
        doc.rect(0, 0, PW, PH).fill(C.white);
        pageHeader('Transaction Ledger');

        let Y4 = 68;
        Y4 = sHead('Recent Transactions', Y4, `Most recent ${recentOrders.length} transactions in this period`);

        const txCols = [
            { label: 'Date',     key: 'date',    w: 76 },
            { label: 'Order ID', key: 'orderId', w: 90 },
            { label: 'Amount',   key: 'amount',  w: 96,                          align: 'right', highlight: true },
            { label: 'Method',   key: 'method',  w: 84 },
            { label: 'Status',   key: 'status',  w: CW - 76 - 90 - 96 - 84,     align: 'center' },
        ];
        const txRows = recentOrders.map((t) => ({
            date:    new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
            orderId: `#${t.orderId}`,
            amount:  fmt(t.totalAmount),
            method:  t.payment && t.payment.method ? t.payment.method : 'N/A',
            status:  t.orderStatus,
        }));
        Y4 = drawTable(txCols, txRows, Y4, { rowHeight: 26 });

        // ── Footers on all pages ────────────────────────────────────────────────
        const totalPg = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPg; i++) {
            doc.switchToPage(i);
            if (i === 0) {
                // Cover page: just add total page count in existing footer strip
                doc.fillColor(C.s4).font('Helvetica').fontSize(7.5)
                   .text(`${totalPg} pages total`, 0, PH - 20, { align: 'right', width: PW - M, lineBreak: false });
            } else {
                pageFooter(i + 1, totalPg);
            }
        }

        doc.end();

    } catch (error) {
        console.error('Error in downloadSalesReport:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to generate sales report PDF' });
    }
};