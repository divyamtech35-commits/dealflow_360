import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import {
    ArrowLeft, ShoppingCart, Repeat2, Package, FileText,
    Printer, CreditCard, CheckCircle2, AlertCircle, RefreshCw,
    TrendingUp, Clock3, DollarSign, Receipt
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UNPAID: 'bg-amber-50 text-amber-700 border-amber-200',
    PARTIALLY_PAID: 'bg-blue-50 text-blue-700 border-blue-200',
    OVERDUE: 'bg-red-50 text-red-700 border-red-200',
    FULFILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING_FULFILLMENT: 'bg-amber-50 text-amber-700 border-amber-200',
    PARTIALLY_FULFILLED: 'bg-blue-50 text-blue-700 border-blue-200',
    VOID: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const OrderBillingView = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [printInvoice, setPrintInvoice] = useState<any | null>(null);
    const [activating, setActivating] = useState(false);
    const [showPayment, setShowPayment] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('Bank Transfer');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await client.get(`/orders/${orderId}/billing-summary`);
            setData(res.data);
        } catch (e) {
            console.error('Failed to load order billing', e);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleActivateBilling = async () => {
        setActivating(true);
        try {
            await client.post(`/orders/${orderId}/activate-billing`);
            await fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to activate billing');
        } finally {
            setActivating(false);
        }
    };

    const openInvoicePrint = async (invoiceId: string) => {
        try {
            const res = await client.get(`/billing/invoices/${invoiceId}`);
            setPrintInvoice(res.data);
        } catch (e) {
            console.error('Failed to load invoice');
        }
    };

    const handleRecordPayment = async () => {
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) return alert('Enter a valid amount');
        try {
            await client.post(`/billing/invoices/${showPayment}/payment`, {
                amount, paymentMethod: payMethod, reference: `PAY-${Date.now()}`
            });
            setShowPayment(null);
            setPayAmount('');
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Payment failed');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!data) return <div className="text-center py-16 text-slate-500">Order billing data not found.</div>;

    const { order, lines, invoices, subscriptions } = data;
    const allInvoices = [...(invoices.oneTime || []), ...(invoices.recurring || []), ...(invoices.adjustments || [])];
    const totalBilled = allInvoices.reduce((s: number, i: any) => s + i.grandTotal, 0);
    const totalPaid = allInvoices.reduce((s: number, i: any) => s + i.amountPaid, 0);
    const totalDue = allInvoices.reduce((s: number, i: any) => s + i.amountDue, 0);
    const isBillingActivated = allInvoices.length > 0;

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <button onClick={() => navigate(-1)} className="mt-1 p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                Order Billing
                                <span className="font-mono text-slate-400 text-lg ml-2">#{order.orderNumber}</span>
                            </h1>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[order.status] || STATUS_STYLES.VOID}`}>
                                {order.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            {order.customerId?.name}
                            {order.customerId?.email && <span className="text-slate-400 ml-1.5">({order.customerId.email})</span>}
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors">
                            <RefreshCw className="w-4 h-4 text-slate-500" />
                        </button>
                        {!isBillingActivated && (
                            <button
                                onClick={handleActivateBilling}
                                disabled={activating}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors disabled:opacity-50"
                            >
                                <Receipt className="w-4 h-4" />
                                {activating ? 'Activating…' : 'Activate Billing'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Billing Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Order Total', value: `$${order.grandTotal.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Total Billed', value: `$${totalBilled.toLocaleString()}`, icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-100' },
                        { label: 'Total Paid', value: `$${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Balance Due', value: `$${totalDue.toLocaleString()}`, icon: Clock3, color: totalDue > 0 ? 'text-red-600' : 'text-slate-400', bg: totalDue > 0 ? 'bg-red-50' : 'bg-slate-50' },
                    ].map(k => (
                        <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <k.icon className={`w-4 h-4 ${k.color}`} />
                            </div>
                            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{k.label}</p>
                        </div>
                    ))}
                </div>

                {/* Order Lines Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* One-Time Lines */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">One-Time Products</h3>
                                <p className="text-xs text-slate-400">Physical goods & services, billed once on delivery</p>
                            </div>
                            <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {(lines.oneTime || []).length} lines
                            </span>
                        </div>
                        {(lines.oneTime || []).length === 0 ? (
                            <div className="px-6 py-8 text-center text-sm text-slate-400">No one-time products in this order.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Unit Price</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(lines.oneTime || []).map((l: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/60">
                                            <td className="px-6 py-3">
                                                <p className="font-semibold text-slate-800">{l.productName}</p>
                                                <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">One-Time</span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-slate-700">{l.quantity}</td>
                                            <td className="px-6 py-3 text-right text-slate-700">${l.unitPrice.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-900">${l.lineTotal.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-3 text-sm font-bold text-slate-700 text-right">Subtotal (one-time)</td>
                                        <td className="px-6 py-3 text-right font-black text-slate-900">
                                            ${(lines.oneTime || []).reduce((s: number, l: any) => s + l.lineTotal, 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>

                    {/* Recurring Lines */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Repeat2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Recurring Subscription Products</h3>
                                <p className="text-xs text-slate-400">Monthly/quarterly charges, auto-renewed</p>
                            </div>
                            <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                {(lines.recurring || []).length} lines
                            </span>
                        </div>
                        {(lines.recurring || []).length === 0 ? (
                            <div className="px-6 py-8 text-center text-sm text-slate-400">No subscription products in this order.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Unit/Cycle</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">MRR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(lines.recurring || []).map((l: any, i: number) => {
                                        const linked = subscriptions.find((s: any) => String(s.productId) === String(l.productId));
                                        return (
                                            <tr key={i} className="hover:bg-slate-50/60">
                                                <td className="px-6 py-3">
                                                    <p className="font-semibold text-slate-800">{l.productName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                                                            {linked?.billingCycle || 'MONTHLY'}
                                                        </span>
                                                        {linked && (
                                                            <Link
                                                                to={`/internal/billing/subscription/${linked._id}`}
                                                                className="text-xs text-blue-600 hover:underline font-medium"
                                                            >
                                                                View Subscription →
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right text-slate-700">{l.quantity}</td>
                                                <td className="px-6 py-3 text-right text-slate-700">${l.unitPrice.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-right font-bold text-blue-700">${l.lineTotal.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-3 text-sm font-bold text-slate-700 text-right">Monthly Recurring Revenue</td>
                                        <td className="px-6 py-3 text-right font-black text-blue-700">
                                            ${(lines.recurring || []).reduce((s: number, l: any) => s + l.lineTotal, 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </div>

                {/* Invoices Section */}
                {!isBillingActivated ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="font-bold text-slate-700 mb-1">Billing Not Yet Activated</h3>
                        <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">
                            Billing is triggered automatically when all shipments are delivered. You can also activate it manually for fulfilled orders.
                        </p>
                        {order.status === 'FULFILLED' && (
                            <button
                                onClick={handleActivateBilling}
                                disabled={activating}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors disabled:opacity-50"
                            >
                                {activating ? 'Activating…' : 'Activate Billing Now'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* One-Time Invoices */}
                        {(invoices.oneTime || []).length > 0 && (
                            <InvoiceCard
                                title="One-Time Invoice"
                                subtitle="Covers all physical products and shipping on this order"
                                icon={<Package className="w-4 h-4 text-slate-600" />}
                                iconBg="bg-slate-100"
                                invoices={invoices.oneTime}
                                onPay={(id: string) => setShowPayment(id)}
                                onPrint={openInvoicePrint}
                            />
                        )}

                        {/* Recurring / Prorated First-Period Invoices */}
                        {(invoices.recurring || []).length > 0 && (
                            <InvoiceCard
                                title="Recurring Subscription Invoices"
                                subtitle="Prorated first-period charges — one invoice per subscription line"
                                icon={<Repeat2 className="w-4 h-4 text-blue-600" />}
                                iconBg="bg-blue-50"
                                invoices={invoices.recurring}
                                onPay={(id: string) => setShowPayment(id)}
                                onPrint={openInvoicePrint}
                            />
                        )}

                        {/* Adjustment Invoices */}
                        {(invoices.adjustments || []).length > 0 && (
                            <InvoiceCard
                                title="Proration Adjustments"
                                subtitle="Mid-cycle quantity changes and credits"
                                icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
                                iconBg="bg-amber-50"
                                invoices={invoices.adjustments}
                                onPay={(id: string) => setShowPayment(id)}
                                onPrint={openInvoicePrint}
                            />
                        )}
                    </div>
                )}

                {/* Active Subscriptions */}
                {subscriptions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Repeat2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Active Subscriptions from this Order</h3>
                                <p className="text-xs text-slate-400">Click "Manage" to view full billing schedule, change quantity, or cancel</p>
                            </div>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Plan</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Cycle</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">MRR</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Next Billing</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subscriptions.map((sub: any) => (
                                    <tr key={sub._id} className="hover:bg-slate-50/60">
                                        <td className="px-6 py-4 font-semibold text-slate-800">{sub.productName}</td>
                                        <td className="px-6 py-4 text-right text-slate-700">{sub.quantity}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                {sub.billingCycle}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-blue-700">${sub.totalRecurringAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-slate-700 text-sm">
                                            {sub.status === 'ACTIVE'
                                                ? new Date(sub.nextBillingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[sub.status] || STATUS_STYLES.VOID}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={`/internal/billing/subscription/${sub._id}`}
                                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                Manage →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPayment(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
                                <p className="text-sm text-slate-500">Mock payment gateway</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount ($)</label>
                            <input type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
                            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                <option>Bank Transfer</option>
                                <option>Credit Card</option>
                                <option>UPI</option>
                                <option>NEFT / RTGS</option>
                                <option>Cheque</option>
                                <option>Cash</option>
                            </select>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowPayment(null)} className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl">Cancel</button>
                            <button onClick={handleRecordPayment} className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow">Record Payment</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Modal */}
            {printInvoice && <InvoicePrintModal data={printInvoice} onClose={() => setPrintInvoice(null)} />}
        </>
    );
};

/* ── Invoice Card ── */
const InvoiceCard = ({ title, subtitle, icon, iconBg, invoices, onPay, onPrint }: any) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
            <div>
                <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
            <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{invoices.length}</span>
        </div>
        <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Lines</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Due</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {invoices.map((inv: any) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3 font-mono font-bold text-slate-800 text-xs">{inv.invoiceNumber}</td>
                        <td className="px-6 py-3">
                            {(inv.lines || []).length > 0 ? (
                                <div className="space-y-0.5">
                                    {/* Show one-time and recurring line counts */}
                                    {inv.lines.filter((l: any) => !l.isRecurring).length > 0 && (
                                        <span className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                                            {inv.lines.filter((l: any) => !l.isRecurring).length} one-time
                                        </span>
                                    )}
                                    {inv.lines.filter((l: any) => l.isRecurring).length > 0 && (
                                        <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                            {inv.lines.filter((l: any) => l.isRecurring).length} recurring
                                        </span>
                                    )}
                                </div>
                            ) : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-slate-900">${inv.grandTotal.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-semibold text-emerald-600">${inv.amountPaid.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-semibold text-red-600">${inv.amountDue.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                inv.status === 'UNPAID' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>{inv.status}</span>
                        </td>
                        <td className="px-6 py-3">
                            <div className="flex items-center justify-end gap-2">
                                {(inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE') && (
                                    <button onClick={() => onPay(inv._id)} className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors">
                                        Pay
                                    </button>
                                )}
                                <button onClick={() => onPrint(inv._id)} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors">
                                    <Printer className="w-3 h-3" /> Print
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/* ── Printable Invoice Modal (shared with SubscriptionDetail) ── */
const InvoicePrintModal = ({ data, onClose }: { data: any; onClose: () => void }) => {
    const { invoice, payments } = data;
    const oneTimeLines = invoice.lines.filter((l: any) => !l.isRecurring);
    const recurringLines = invoice.lines.filter((l: any) => l.isRecurring);

    return (
        <>
            <style>{`@media print { body > *:not(#inv-print) { display:none!important; } #inv-print { position:fixed;inset:0;background:#fff;z-index:9999;overflow:auto; } .np{display:none!important;} @page{margin:1.5cm;size:A4;} }`}</style>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div id="inv-print" className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="np flex items-center justify-between px-8 py-4 border-b border-slate-200">
                        <h2 className="text-base font-bold text-slate-800">Invoice — {invoice.invoiceNumber}</h2>
                        <div className="flex gap-2">
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow">
                                <Printer className="w-4 h-4" /> Print / PDF
                            </button>
                            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">Close</button>
                        </div>
                    </div>
                    <div className="px-10 py-8 space-y-7">
                        {/* Letterhead */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">D3</div>
                                <div>
                                    <p className="font-extrabold text-slate-900 text-xl">DealFlow<span className="text-blue-600">360</span></p>
                                    <p className="text-xs text-slate-400">Finance Operations</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-slate-900">INVOICE</p>
                                <p className="font-mono text-blue-600 font-bold mt-1">{invoice.invoiceNumber}</p>
                                <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold border ${invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{invoice.status}</span>
                            </div>
                        </div>
                        {/* Bill To */}
                        <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Bill To</p>
                                <p className="font-bold text-slate-900">{invoice.customerId?.name}</p>
                                <p className="text-sm text-slate-500">{invoice.customerId?.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-xs font-bold uppercase text-slate-400 mb-1">Issue Date</p><p className="text-sm font-semibold">{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                                <div><p className="text-xs font-bold uppercase text-slate-400 mb-1">Due Date</p><p className="text-sm font-semibold">{new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                            </div>
                        </div>
                        {/* One-time lines */}
                        {oneTimeLines.length > 0 && <LineTable title="One-Time Charges" accent="slate" lines={oneTimeLines} />}
                        {/* Recurring lines */}
                        {recurringLines.length > 0 && <LineTable title="Recurring Subscription Charges" accent="blue" lines={recurringLines} showPeriod />}
                        {/* Totals */}
                        <div className="flex justify-end border-t border-slate-200 pt-5">
                            <div className="w-72 space-y-2">
                                <TotalRow label="Subtotal" value={`$${invoice.subtotal.toLocaleString()}`} />
                                <TotalRow label="Tax (10%)" value={`$${invoice.taxTotal.toLocaleString()}`} />
                                <TotalRow label="Amount Paid" value={`–$${invoice.amountPaid.toLocaleString()}`} valueClass="text-emerald-600" />
                                <div className="flex justify-between border-t border-slate-200 pt-2">
                                    <span className="font-bold text-slate-900">Balance Due</span>
                                    <span className="font-black text-xl text-red-600">${invoice.amountDue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        {/* Payment history */}
                        {payments?.length > 0 && (
                            <div>
                                <SLabel label="Payment History" color="text-emerald-600" line="bg-emerald-100" />
                                <table className="w-full text-sm mt-2">
                                    <thead><tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                                        <th className="pb-2 text-left">Date</th><th className="pb-2 text-left">Method</th><th className="pb-2 text-left">Reference</th><th className="pb-2 text-right">Amount</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map((p: any, i: number) => (
                                            <tr key={i}><td className="py-2 text-slate-700">{new Date(p.paidAt).toLocaleDateString('en-IN')}</td><td className="py-2 text-slate-700">{p.paymentMethod}</td><td className="py-2 font-mono text-xs text-slate-400">{p.paymentReference}</td><td className="py-2 text-right font-semibold text-emerald-700">${p.amount.toLocaleString()}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="text-center text-xs text-slate-400 border-t border-slate-200 pt-5">
                            <p>Thank you for your business. Queries: <strong>finance@dealflow360.com</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const LineTable = ({ title, accent, lines, showPeriod = false }: any) => (
    <div>
        <SLabel label={title} color={accent === 'blue' ? 'text-blue-600' : 'text-slate-600'} line={accent === 'blue' ? 'bg-blue-100' : 'bg-slate-200'} />
        <table className="w-full text-sm mt-2">
            <thead><tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                <th className="pb-2 text-left">Item</th>{showPeriod && <th className="pb-2 text-left">Period</th>}<th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit Price</th><th className="pb-2 text-right">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
                {lines.map((l: any, i: number) => (
                    <tr key={i}>
                        <td className="py-3"><p className="font-semibold text-slate-800">{l.productName}</p>{l.description && <p className="text-xs text-slate-400">{l.description}</p>}</td>
                        {showPeriod && <td className="py-3 text-xs text-slate-500">{l.periodStart ? `${new Date(l.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(l.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : '—'}</td>}
                        <td className="py-3 text-right text-slate-700">{l.quantity}</td>
                        <td className="py-3 text-right text-slate-700">${l.unitPrice.toLocaleString()}</td>
                        <td className="py-3 text-right font-bold text-slate-900">${l.lineTotal.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const SLabel = ({ label, color, line }: any) => (
    <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${color}`}>{label}</span>
        <div className={`flex-1 h-px ${line}`} />
    </div>
);

const TotalRow = ({ label, value, valueClass = 'text-slate-700' }: any) => (
    <div className="flex justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
);
