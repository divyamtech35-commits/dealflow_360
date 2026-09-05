import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import {
    ArrowLeft, Settings, XCircle, FileText, Printer, RefreshCw,
    CalendarRange, TrendingUp, CreditCard, AlertCircle, CheckCircle2,
    Repeat2, ShoppingCart, ChevronRight, Info, ReceiptText
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
    EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UNPAID: 'bg-amber-50 text-amber-700 border-amber-200',
    PARTIALLY_PAID: 'bg-blue-50 text-blue-700 border-blue-200',
    OVERDUE: 'bg-red-50 text-red-700 border-red-200',
    VOID: 'bg-gray-100 text-gray-500 border-gray-200',
    UPCOMING: 'bg-slate-100 text-slate-600 border-slate-200',
    INVOICED: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const SubscriptionDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCancel, setShowCancel] = useState(false);
    const [showQuantity, setShowQuantity] = useState(false);
    const [showPayment, setShowPayment] = useState<string | null>(null); // invoice id
    const [printInvoice, setPrintInvoice] = useState<any | null>(null);

    // Form state
    const [cancelReason, setCancelReason] = useState('');
    const [newQuantity, setNewQuantity] = useState(1);
    const [prorationPreview, setProrationPreview] = useState<any | null>(null);
    const [prorationLoading, setProrationLoading] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('Bank Transfer');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await client.get(`/billing/subscriptions/${id}`);
            setData(res.data);
            setNewQuantity(res.data.subscription.quantity);
        } catch (e) {
            console.error('Failed to load subscription');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { if (id) fetchData(); }, [fetchData]);

    // Proration preview whenever newQuantity changes
    useEffect(() => {
        if (!showQuantity || !id || !data) return;
        const sub = data.subscription;
        if (newQuantity === sub.quantity) { setProrationPreview(null); return; }
        const timer = setTimeout(async () => {
            setProrationLoading(true);
            try {
                const res = await client.post(`/billing/subscriptions/${id}/proration-preview`, { newQuantity });
                setProrationPreview(res.data);
            } catch (e) {
                setProrationPreview(null);
            } finally {
                setProrationLoading(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [newQuantity, showQuantity, id, data]);

    const handleCancel = async () => {
        try {
            await client.post(`/billing/subscriptions/${id}/cancel`, { reason: cancelReason });
            setShowCancel(false);
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to cancel subscription');
        }
    };

    const handleQuantityChange = async () => {
        try {
            await client.post(`/billing/subscriptions/${id}/change-quantity`, { quantity: newQuantity });
            setShowQuantity(false);
            setProrationPreview(null);
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to update quantity');
        }
    };

    const handleRecordPayment = async () => {
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) return alert('Enter a valid amount');
        try {
            await client.post(`/billing/invoices/${showPayment}/payment`, {
                amount,
                paymentMethod: payMethod,
                reference: `PAY-${Date.now()}`
            });
            setShowPayment(null);
            setPayAmount('');
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Payment failed');
        }
    };

    const handleGenerateInvoice = async (scheduleId: string) => {
        try {
            await client.post('/billing/invoices/generate', {
                scheduleId,
                customerId: data.subscription.customerId._id,
                orderId: data.subscription.orderId
            });
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Invoice generation failed');
        }
    };

    const openInvoicePrint = async (invoiceId: string) => {
        try {
            const res = await client.get(`/billing/invoices/${invoiceId}`);
            setPrintInvoice(res.data);
        } catch (e) {
            console.error('Failed to load invoice for printing');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!data) return <div className="text-center py-16 text-slate-500">Subscription not found.</div>;

    const { subscription: sub, schedules, invoices } = data;
    const oneTimeInvoices = invoices.filter((i: any) => i.invoiceType === 'ONE_TIME' || !i.subscriptionId);
    const recurringInvoices = invoices.filter((i: any) => i.invoiceType === 'RECURRING' || i.subscriptionId);
    const adjustmentInvoices = invoices.filter((i: any) => i.invoiceType === 'ADJUSTMENT');

    const upcomingSchedules = schedules.filter((s: any) => s.status === 'UPCOMING');
    const pastSchedules = schedules.filter((s: any) => s.status !== 'UPCOMING');

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <button onClick={() => navigate('/internal/billing')} className="mt-1 p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                Subscription
                                <span className="font-mono text-slate-400 text-lg ml-2">#{sub._id.slice(-8).toUpperCase()}</span>
                            </h1>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[sub.status] || STATUS_STYLES.VOID}`}>
                                {sub.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            {sub.customerId?.name}
                            {sub.customerId?.email && <span className="text-slate-400 ml-1">({sub.customerId.email})</span>}
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors">
                            <RefreshCw className="w-4 h-4 text-slate-500" />
                        </button>
                        {sub.status === 'ACTIVE' && (
                            <>
                                <button onClick={() => setShowQuantity(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
                                    <Settings className="w-4 h-4" /> Change Quantity
                                </button>
                                <button onClick={() => setShowCancel(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium text-sm shadow-sm">
                                    <XCircle className="w-4 h-4" /> Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Subscription Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Plan</p>
                            <p className="font-bold text-slate-900">{sub.productName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{sub.billingCycle}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Quantity</p>
                            <p className="font-bold text-slate-900 text-xl">{sub.quantity}</p>
                            <p className="text-xs text-slate-400 mt-0.5">seats / units</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Unit Price</p>
                            <p className="font-bold text-slate-900">₹{sub.unitPrice.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 mt-0.5">per unit</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">MRR</p>
                            <p className="font-bold text-blue-700 text-xl">₹{sub.totalRecurringAmount.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 mt-0.5">recurring</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Next Billing</p>
                            <p className="font-bold text-slate-900">
                                {sub.status === 'ACTIVE'
                                    ? new Date(sub.nextBillingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Started {new Date(sub.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    {sub.cancellationDate && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="text-sm text-red-700">
                                <span className="font-semibold">Cancelled on {new Date(sub.cancellationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.</span>
                                {sub.cancellationReason && <span className="ml-1">Reason: {sub.cancellationReason}</span>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main content grid */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* Billing Schedule - left column (wider) */}
                    <div className="xl:col-span-3 space-y-4">
                        {/* Upcoming Schedules */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <CalendarRange className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Upcoming Billing Schedule</h3>
                                    <p className="text-xs text-slate-400">Future recurring charges</p>
                                </div>
                                <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {upcomingSchedules.length} upcoming
                                </span>
                            </div>
                            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Period</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Qty</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Amount</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {upcomingSchedules.length === 0 && (
                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">No upcoming schedules.</td></tr>
                                        )}
                                        {upcomingSchedules.slice(0, 6).map((sch: any) => (
                                            <tr key={sch._id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-3">
                                                    <p className="font-semibold text-slate-800 text-xs">
                                                        {new Date(sch.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                        {' – '}
                                                        {new Date(sch.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        Due: {new Date(sch.billingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-3 text-slate-700">{sch.quantity}</td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-900">₹{sch.total.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-right">
                                                    {sub.status === 'ACTIVE' && (
                                                        <button
                                                            onClick={() => handleGenerateInvoice(sch._id)}
                                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                                        >
                                                            Generate Invoice
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Past Schedules */}
                        {pastSchedules.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">Past Billing Periods</h3>
                                        <p className="text-xs text-slate-400">Invoiced and paid cycles</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Period</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pastSchedules.map((sch: any) => (
                                                <tr key={sch._id} className="hover:bg-slate-50/60">
                                                    <td className="px-6 py-3 text-xs font-semibold text-slate-700">
                                                        {new Date(sch.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                        {' – '}
                                                        {new Date(sch.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-bold text-slate-900 text-sm">₹{sch.total.toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-right">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[sch.status] || STATUS_STYLES.VOID}`}>
                                                            {sch.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Invoices - right column */}
                    <div className="xl:col-span-2 space-y-4">
                        {/* Recurring Invoices */}
                        <InvoiceSection
                            title="Recurring Invoices"
                            icon={<Repeat2 className="w-4 h-4 text-blue-600" />}
                            iconBg="bg-blue-50"
                            invoices={recurringInvoices}
                            onPay={(id) => setShowPayment(id)}
                            onPrint={openInvoicePrint}
                        />

                        {/* Adjustment Invoices */}
                        {adjustmentInvoices.length > 0 && (
                            <InvoiceSection
                                title="Proration Adjustments"
                                icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
                                iconBg="bg-amber-50"
                                invoices={adjustmentInvoices}
                                onPay={(id) => setShowPayment(id)}
                                onPrint={openInvoicePrint}
                            />
                        )}

                        {/* One-time Invoices */}
                        {oneTimeInvoices.length > 0 && (
                            <InvoiceSection
                                title="One-Time Charges"
                                icon={<ShoppingCart className="w-4 h-4 text-purple-600" />}
                                iconBg="bg-purple-50"
                                invoices={oneTimeInvoices}
                                onPay={(id) => setShowPayment(id)}
                                onPrint={openInvoicePrint}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Cancel Modal ── */}
            {showCancel && (
                <Modal onClose={() => setShowCancel(false)}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Cancel Subscription</h3>
                                <p className="text-sm text-slate-500">This action cannot be undone</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-amber-800">
                                If cancelled mid-cycle, a <strong>prorated credit note</strong> will be automatically issued for the unused period. Future billing schedules will be voided.
                            </p>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cancellation Reason</label>
                            <textarea
                                rows={3}
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="e.g. Customer requested via email on 5th Sep..."
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowCancel(false)} className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                                Keep Active
                            </button>
                            <button onClick={handleCancel} className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow transition-colors">
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Change Quantity Modal with Proration Preview ── */}
            {showQuantity && (
                <Modal onClose={() => { setShowQuantity(false); setProrationPreview(null); }}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Settings className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Change Subscription Quantity</h3>
                                <p className="text-sm text-slate-500">Mid-cycle changes are automatically prorated</p>
                            </div>
                        </div>

                        {/* Current Plan Info */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">Current Qty</p>
                                <p className="font-bold text-slate-900 text-lg">{data.subscription.quantity}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">Unit Price</p>
                                <p className="font-bold text-slate-900">₹{data.subscription.unitPrice.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">Current MRR</p>
                                <p className="font-bold text-blue-700">₹{data.subscription.totalRecurringAmount.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* New Quantity Input */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Quantity</label>
                            <input
                                type="number" min="1"
                                value={newQuantity}
                                onChange={e => setNewQuantity(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {/* New MRR Preview */}
                        {newQuantity !== data.subscription.quantity && (
                            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                                <p className="text-blue-800 font-semibold">New MRR: ₹{(newQuantity * data.subscription.unitPrice).toLocaleString()}</p>
                            </div>
                        )}

                        {/* Proration Preview */}
                        {prorationLoading && (
                            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Calculating proration...
                            </div>
                        )}
                        {prorationPreview && !prorationLoading && (
                            <div className={`mb-4 rounded-xl border p-4 ${
                                prorationPreview.adjustmentAmount > 0
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-purple-50 border-purple-200'
                            }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className={`w-4 h-4 ${prorationPreview.adjustmentAmount > 0 ? 'text-amber-600' : 'text-purple-600'}`} />
                                    <p className={`text-sm font-bold ${prorationPreview.adjustmentAmount > 0 ? 'text-amber-800' : 'text-purple-800'}`}>
                                        {prorationPreview.adjustmentAmount > 0 ? 'Upgrade — Additional Invoice Will Be Generated' : 'Downgrade — Credit Note Will Be Issued'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <p className="text-slate-500 mb-1">Remaining Days</p>
                                        <p className="font-bold text-slate-800">{prorationPreview.remainingDays} / {prorationPreview.totalBillingDays}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 mb-1">Old Period Value</p>
                                        <p className="font-bold text-slate-800">₹{prorationPreview.oldPeriodValue.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 mb-1">New Period Value</p>
                                        <p className="font-bold text-slate-800">₹{prorationPreview.newPeriodValue.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className={`mt-3 pt-3 border-t ${prorationPreview.adjustmentAmount > 0 ? 'border-amber-200' : 'border-purple-200'}`}>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-semibold text-slate-700">
                                            {prorationPreview.adjustmentAmount > 0 ? 'Amount to Invoice:' : 'Credit to Issue:'}
                                        </p>
                                        <p className={`text-base font-black ${prorationPreview.adjustmentAmount > 0 ? 'text-amber-700' : 'text-purple-700'}`}>
                                            ₹{Math.abs(prorationPreview.adjustmentAmount).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setShowQuantity(false); setProrationPreview(null); }} className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleQuantityChange}
                                disabled={newQuantity === data.subscription.quantity || newQuantity < 1}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow transition-colors"
                            >
                                Apply Change
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Record Payment Modal ── */}
            {showPayment && (
                <Modal onClose={() => { setShowPayment(null); setPayAmount(''); }}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
                                <p className="text-sm text-slate-500">Mock payment gateway</p>
                            </div>
                        </div>
                        {/* Amount */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Amount (₹)</label>
                            <input
                                type="number" min="1"
                                value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        {/* Method */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
                            <select
                                value={payMethod}
                                onChange={e => setPayMethod(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                            >
                                <option>Bank Transfer</option>
                                <option>Credit Card</option>
                                <option>UPI</option>
                                <option>Cheque</option>
                                <option>NEFT / RTGS</option>
                                <option>Cash</option>
                            </select>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 text-xs text-slate-500">
                            A unique payment reference will be auto-generated. Partial payments are supported — the invoice will be marked <strong>PARTIALLY_PAID</strong> until the full amount is received.
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setShowPayment(null); setPayAmount(''); }} className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleRecordPayment} className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-colors">
                                Record Payment
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Invoice Print Modal ── */}
            {printInvoice && (
                <InvoicePrintModal data={printInvoice} onClose={() => setPrintInvoice(null)} />
            )}
        </>
    );
};

/* ── Reusable Invoice Section ── */
const InvoiceSection = ({ title, icon, iconBg, invoices, onPay, onPrint }: {
    title: string; icon: React.ReactNode; iconBg: string;
    invoices: any[]; onPay: (id: string) => void; onPrint: (id: string) => void;
}) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
            <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            <span className="ml-auto text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{invoices.length}</span>
        </div>
        {invoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400">No {title.toLowerCase()} yet.</div>
        ) : (
            <div className="divide-y divide-slate-100">
                {invoices.map((inv: any) => (
                    <div key={inv._id} className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <p className="font-mono text-xs font-bold text-slate-800 truncate">{inv.invoiceNumber}</p>
                                </div>
                                {inv.lines?.[0]?.periodStart && (
                                    <p className="text-xs text-slate-400 mt-0.5 ml-5">
                                        {new Date(inv.lines[0].periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        {' – '}
                                        {new Date(inv.lines[0].periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-bold text-slate-900 text-sm">₹{inv.grandTotal.toLocaleString()}</p>
                                {inv.amountDue > 0 && (
                                    <p className="text-xs text-red-600 font-medium">Due: ₹{inv.amountDue.toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                STATUS_STYLES[inv.status] || STATUS_STYLES.VOID
                            }`}>
                                {inv.status}
                            </span>
                            <div className="ml-auto flex gap-2">
                                {(inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE') && (
                                    <button onClick={() => onPay(inv._id)} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 hover:bg-emerald-50 rounded-lg transition-colors">
                                        Pay
                                    </button>
                                )}
                                <button onClick={() => onPrint(inv._id)} className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1">
                                    <Printer className="w-3 h-3" /> Print
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

/* ── Modal wrapper ── */
const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

/* ── Printable Invoice Modal ── */
const InvoicePrintModal = ({ data, onClose }: { data: any; onClose: () => void }) => {
    const { invoice, payments } = data;
    const oneTimeLines = invoice.lines.filter((l: any) => !l.isRecurring);
    const recurringLines = invoice.lines.filter((l: any) => l.isRecurring);

    return (
        <>
            <style>{`
                @media print {
                    body > *:not(#invoice-print-root) { display: none !important; }
                    #invoice-print-root { position: fixed; inset: 0; background: white; z-index: 9999; overflow: auto; padding: 0; }
                    .no-print { display: none !important; }
                    @page { margin: 1.5cm; size: A4; }
                }
            `}</style>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div id="invoice-print-root" className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Actions */}
                    <div className="no-print flex items-center justify-between px-8 py-4 border-b border-slate-200 shrink-0">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Invoice Preview — {invoice.invoiceNumber}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors">
                                <Printer className="w-4 h-4" /> Print / Save PDF
                            </button>
                            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium">Close</button>
                        </div>
                    </div>

                    {/* Invoice Content */}
                    <div className="px-10 py-8 space-y-7 flex-1">
                        {/* Letterhead */}
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">D3</div>
                                    <div>
                                        <p className="font-extrabold text-slate-900 text-xl leading-none">DealFlow<span className="text-blue-600">360</span></p>
                                        <p className="text-xs text-slate-400 mt-0.5">Sales & Finance Operations</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">finance@dealflow360.com</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black text-slate-900 tracking-tight">INVOICE</p>
                                <p className="font-mono text-blue-600 font-bold mt-1">{invoice.invoiceNumber}</p>
                                <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold border ${
                                    invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    invoice.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>{invoice.status}</span>
                            </div>
                        </div>

                        {/* Bill To / Invoice Info */}
                        <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Bill To</p>
                                <p className="font-bold text-slate-900">{invoice.customerId?.name}</p>
                                <p className="text-sm text-slate-500 mt-0.5">{invoice.customerId?.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Issue Date</p>
                                    <p className="text-sm font-semibold text-slate-800">{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Due Date</p>
                                    <p className="text-sm font-semibold text-slate-800">{new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>

                        {/* One-Time Lines */}
                        {oneTimeLines.length > 0 && (
                            <LineSection title="One-Time Charges" accent="slate" lines={oneTimeLines} showPeriod={false} />
                        )}

                        {/* Recurring Lines */}
                        {recurringLines.length > 0 && (
                            <LineSection title="Recurring Subscription Charges" accent="blue" lines={recurringLines} showPeriod />
                        )}

                        {/* Totals */}
                        <div className="flex justify-end border-t border-slate-200 pt-5">
                            <div className="w-72 space-y-2">
                                <Row label="Subtotal" value={`₹${invoice.subtotal.toLocaleString()}`} />
                                <Row label="Tax (10%)" value={`₹${invoice.taxTotal.toLocaleString()}`} />
                                <Row label="Amount Paid" value={`–₹${invoice.amountPaid.toLocaleString()}`} valueClass="text-emerald-600" />
                                <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                                    <span className="font-bold text-slate-900">Balance Due</span>
                                    <span className="font-black text-xl text-red-600">₹{invoice.amountDue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        {payments?.length > 0 && (
                            <div>
                                <SectionLabel label="Payment History" color="text-emerald-600" lineColor="bg-emerald-100" />
                                <table className="w-full text-sm mt-2">
                                    <thead><tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                                        <th className="pb-2 text-left">Date</th><th className="pb-2 text-left">Method</th>
                                        <th className="pb-2 text-left">Reference</th><th className="pb-2 text-right">Amount</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map((p: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-2 text-slate-700">{new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
                                                <td className="py-2 text-slate-700">{p.paymentMethod}</td>
                                                <td className="py-2 font-mono text-xs text-slate-400">{p.paymentReference}</td>
                                                <td className="py-2 text-right font-semibold text-emerald-700">₹{p.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-xs text-slate-400 border-t border-slate-200 pt-5">
                            <p>Thank you for your business. Please transfer the balance due by the date above.</p>
                            <p className="mt-1">For queries, contact <strong>finance@dealflow360.com</strong> | DealFlow360 Finance Operations</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const LineSection = ({ title, accent, lines, showPeriod }: { title: string; accent: string; lines: any[]; showPeriod: boolean }) => (
    <div>
        <SectionLabel label={title} color={accent === 'blue' ? 'text-blue-600' : 'text-slate-600'} lineColor={accent === 'blue' ? 'bg-blue-100' : 'bg-slate-200'} />
        <table className="w-full text-sm mt-2">
            <thead><tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                <th className="pb-2 text-left">Item</th>
                {showPeriod && <th className="pb-2 text-left">Period</th>}
                <th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit Price</th><th className="pb-2 text-right">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
                {lines.map((line: any, i: number) => (
                    <tr key={i}>
                        <td className="py-3">
                            <p className="font-semibold text-slate-800">{line.productName}</p>
                            {line.description && <p className="text-xs text-slate-400 mt-0.5">{line.description}</p>}
                        </td>
                        {showPeriod && (
                            <td className="py-3 text-xs text-slate-500">
                                {line.periodStart ? `${new Date(line.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(line.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : '—'}
                            </td>
                        )}
                        <td className="py-3 text-right text-slate-700">{line.quantity}</td>
                        <td className="py-3 text-right text-slate-700">₹{line.unitPrice.toLocaleString()}</td>
                        <td className="py-3 text-right font-bold text-slate-900">₹{line.lineTotal.toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const SectionLabel = ({ label, color, lineColor }: { label: string; color: string; lineColor: string }) => (
    <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${color}`}>{label}</span>
        <div className={`flex-1 h-px ${lineColor}`} />
    </div>
);

const Row = ({ label, value, valueClass = 'text-slate-700' }: { label: string; value: string; valueClass?: string }) => (
    <div className="flex justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
);
