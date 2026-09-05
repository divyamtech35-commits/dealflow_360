import React, { useEffect, useState, useCallback } from 'react';
import client from '../../api/client';
import { Link } from 'react-router-dom';
import {
    CreditCard, FileText, AlertCircle, TrendingUp, CheckCircle,
    Printer, RefreshCw, ChevronRight, ArrowUpRight, BadgeIndianRupee,
    Activity, ReceiptText, BadgeAlert, Clock3
} from 'lucide-react';

interface Summary {
    activeSubscriptions: number;
    billingThisMonth: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalCredits: number;
}

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
    DRAFT: 'bg-gray-100 text-gray-600 border-gray-200',
};

type TabType = 'subscriptions' | 'invoices' | 'credits';

export const BillingDashboard = () => {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [credits, setCredits] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('subscriptions');
    const [loading, setLoading] = useState(true);
    const [printInvoice, setPrintInvoice] = useState<any | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sumRes, subRes, invRes, creditRes] = await Promise.all([
                client.get('/billing/summary'),
                client.get('/billing/subscriptions'),
                client.get('/billing/reconciliation'),
                client.get('/billing/credit-notes'),
            ]);
            setSummary(sumRes.data);
            setSubscriptions(subRes.data);
            setInvoices(invRes.data);
            setCredits(creditRes.data);
        } catch (e) {
            console.error('Failed to load billing data', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openInvoicePrint = async (invoiceId: string) => {
        try {
            const res = await client.get(`/billing/invoices/${invoiceId}`);
            setPrintInvoice(res.data);
        } catch (e) {
            console.error('Failed to load invoice', e);
        }
    };

    const kpis = [
        {
            label: 'Active Subscriptions',
            value: summary?.activeSubscriptions ?? 0,
            icon: Activity,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            suffix: ''
        },
        {
            label: 'MRR This Month',
            value: summary?.billingThisMonth ?? 0,
            icon: BadgeIndianRupee,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            prefix: '₹',
            format: true
        },
        {
            label: 'Pending Invoices',
            value: summary?.pendingInvoices ?? 0,
            icon: Clock3,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            suffix: ''
        },
        {
            label: 'Overdue Invoices',
            value: summary?.overdueInvoices ?? 0,
            icon: BadgeAlert,
            color: 'text-red-600',
            bg: 'bg-red-50',
            suffix: ''
        },
        {
            label: 'Credits Issued',
            value: summary?.totalCredits ?? 0,
            icon: ReceiptText,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            prefix: '₹',
            format: true
        },
    ];

    const TABS: { id: TabType; label: string; count?: number }[] = [
        { id: 'subscriptions', label: 'Active Subscriptions', count: subscriptions.length },
        { id: 'invoices', label: 'Billing & Invoices', count: invoices.length },
        { id: 'credits', label: 'Credit Notes', count: credits.length },
    ];

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription & Billing</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage recurring subscriptions, invoices, payments and credits</p>
                    </div>
                    <button
                        onClick={fetchAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {kpi.prefix ?? ''}{kpi.format ? Number(kpi.value).toLocaleString() : kpi.value}{kpi.suffix ?? ''}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Tabs */}
                    <div className="flex gap-0 border-b border-slate-200 px-6 pt-4">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 px-3 mr-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                        activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Subscriptions Tab */}
                    {activeTab === 'subscriptions' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty × Price</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">MRR</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Billing</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subscriptions.length === 0 && (
                                        <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">No subscriptions found.</td></tr>
                                    )}
                                    {subscriptions.map(sub => (
                                        <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900 text-sm">{sub.customerId?.name || '—'}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{sub.customerId?.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900 text-sm">{sub.productName}</p>
                                                <span className="text-xs text-slate-400">{sub.billingCycle}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {sub.quantity} × ₹{sub.unitPrice.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                                                ₹{(sub.quantity * sub.unitPrice).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {sub.status === 'ACTIVE'
                                                    ? new Date(sub.nextBillingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[sub.status] || STATUS_STYLES.VOID}`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    to={`/internal/billing/subscription/${sub._id}`}
                                                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    Manage <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Invoices Tab */}
                    {activeTab === 'invoices' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Paid</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Due</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Print</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoices.length === 0 && (
                                        <tr><td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400">No invoices found.</td></tr>
                                    )}
                                    {invoices.map(inv => (
                                        <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <span className="font-mono text-sm font-semibold text-slate-800">{inv.invoiceNumber}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900 text-sm">{inv.customerId?.name || '—'}</p>
                                                <p className="text-xs text-slate-400">{inv.customerId?.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                                    {inv.invoiceType || 'ONE_TIME'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 text-sm">₹{inv.grandTotal.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-emerald-600">₹{inv.amountPaid.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-red-600">₹{inv.amountDue.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[inv.status] || STATUS_STYLES.VOID}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openInvoicePrint(inv._id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                                                >
                                                    <Printer className="w-3.5 h-3.5" /> Print
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Credits Tab */}
                    {activeTab === 'credits' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Credit Note #</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Issued On</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {credits.length === 0 && (
                                        <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400">No credit notes found.</td></tr>
                                    )}
                                    {credits.map((cn: any) => (
                                        <tr key={cn._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm font-semibold text-slate-800">{cn.creditNoteNumber}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900 text-sm">{cn.customerId?.name || '—'}</p>
                                                <p className="text-xs text-slate-400">{cn.customerId?.email}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{cn.reason}</td>
                                            <td className="px-6 py-4 font-bold text-purple-700 text-sm">₹{cn.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                    cn.status === 'ISSUED' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    cn.status === 'APPLIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    {cn.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {new Date(cn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Print Modal */}
            {printInvoice && (
                <InvoicePrintModal data={printInvoice} onClose={() => setPrintInvoice(null)} />
            )}
        </>
    );
};

/* ─────────────────────────────────────────────
   Invoice Print Modal Component
───────────────────────────────────────────── */
const InvoicePrintModal = ({ data, onClose }: { data: any; onClose: () => void }) => {
    const { invoice, payments } = data;
    const oneTimeLines = invoice.lines.filter((l: any) => !l.isRecurring);
    const recurringLines = invoice.lines.filter((l: any) => l.isRecurring);

    const handlePrint = () => window.print();

    return (
        <>
            {/* Print CSS */}
            <style>{`
                @media print {
                    body > *:not(#invoice-print-root) { display: none !important; }
                    #invoice-print-root { position: fixed; inset: 0; background: white; z-index: 9999; }
                    .no-print { display: none !important; }
                    @page { margin: 1.5cm; }
                }
            `}</style>

            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    id="invoice-print-root"
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Actions */}
                    <div className="no-print flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800">Invoice Preview</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-colors"
                            >
                                <Printer className="w-4 h-4" /> Print / Save PDF
                            </button>
                            <button onClick={onClose} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors">
                                Close
                            </button>
                        </div>
                    </div>

                    {/* Invoice Body */}
                    <div className="px-10 py-8 space-y-8">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
                                        D3
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-slate-900 text-lg leading-none">DealFlow<span className="text-blue-600">360</span></p>
                                        <p className="text-xs text-slate-400 mt-0.5">Sales & Finance Operations</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mt-3">support@dealflow360.com</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-slate-900 tracking-tight">INVOICE</p>
                                <p className="font-mono text-blue-600 font-bold mt-1">{invoice.invoiceNumber}</p>
                                <span className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    invoice.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                    {invoice.status}
                                </span>
                            </div>
                        </div>

                        {/* Billing Info */}
                        <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Bill To</p>
                                <p className="font-bold text-slate-900">{invoice.customerId?.name || 'Customer'}</p>
                                <p className="text-sm text-slate-500">{invoice.customerId?.email}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="flex justify-end gap-8 text-sm">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Issue Date</p>
                                        <p className="font-semibold text-slate-800">{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Due Date</p>
                                        <p className="font-semibold text-slate-800">{new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* One-Time Lines */}
                        {oneTimeLines.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">One-Time Charges</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                                            <th className="pb-2 text-left">Item</th>
                                            <th className="pb-2 text-right">Qty</th>
                                            <th className="pb-2 text-right">Unit Price</th>
                                            <th className="pb-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {oneTimeLines.map((line: any, i: number) => (
                                            <tr key={i} className="py-2">
                                                <td className="py-3">
                                                    <p className="font-semibold text-slate-800">{line.productName}</p>
                                                    {line.description && <p className="text-xs text-slate-400 mt-0.5">{line.description}</p>}
                                                </td>
                                                <td className="py-3 text-right text-slate-700">{line.quantity}</td>
                                                <td className="py-3 text-right text-slate-700">₹{line.unitPrice.toLocaleString()}</td>
                                                <td className="py-3 text-right font-bold text-slate-900">₹{line.lineTotal.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Recurring Lines */}
                        {recurringLines.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold uppercase tracking-widest text-blue-500">Recurring Subscription Charges</span>
                                    <div className="flex-1 h-px bg-blue-100" />
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                                            <th className="pb-2 text-left">Item</th>
                                            <th className="pb-2 text-left">Billing Period</th>
                                            <th className="pb-2 text-right">Qty</th>
                                            <th className="pb-2 text-right">Unit Price</th>
                                            <th className="pb-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recurringLines.map((line: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                        <p className="font-semibold text-slate-800">{line.productName}</p>
                                                    </div>
                                                    {line.description && <p className="text-xs text-slate-400 mt-0.5 ml-3">{line.description}</p>}
                                                </td>
                                                <td className="py-3 text-xs text-slate-500">
                                                    {line.periodStart && line.periodEnd
                                                        ? `${new Date(line.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(line.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                                        : '—'}
                                                </td>
                                                <td className="py-3 text-right text-slate-700">{line.quantity}</td>
                                                <td className="py-3 text-right text-slate-700">₹{line.unitPrice.toLocaleString()}</td>
                                                <td className="py-3 text-right font-bold text-slate-900">₹{line.lineTotal.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-end">
                                <div className="w-72 space-y-2">
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Subtotal</span>
                                        <span className="font-medium">₹{invoice.subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Tax (10%)</span>
                                        <span className="font-medium">₹{invoice.taxTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-emerald-700">
                                        <span>Amount Paid</span>
                                        <span className="font-semibold">– ₹{invoice.amountPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                                        <span>Balance Due</span>
                                        <span className="text-red-600">₹{invoice.amountDue.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        {payments && payments.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Payment History</span>
                                    <div className="flex-1 h-px bg-emerald-100" />
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs font-bold uppercase text-slate-400 border-b border-slate-200">
                                            <th className="pb-2 text-left">Date</th>
                                            <th className="pb-2 text-left">Method</th>
                                            <th className="pb-2 text-left">Reference</th>
                                            <th className="pb-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map((p: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-2 text-slate-700">{new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
                                                <td className="py-2 text-slate-700">{p.paymentMethod}</td>
                                                <td className="py-2 font-mono text-xs text-slate-500">{p.paymentReference}</td>
                                                <td className="py-2 text-right font-semibold text-emerald-700">₹{p.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-xs text-slate-400 border-t border-slate-200 pt-6">
                            <p>Thank you for your business. Please make payment by the due date.</p>
                            <p className="mt-1">For queries, contact finance@dealflow360.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
