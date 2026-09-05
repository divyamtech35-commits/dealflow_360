import React, { useEffect, useState, useCallback, useMemo } from 'react';
import client from '../../api/client';
import { Link } from 'react-router-dom';
import {
    CreditCard, FileText, AlertCircle, TrendingUp, CheckCircle,
    Printer, RefreshCw, ChevronRight, ArrowUpRight, DollarSign,
    Activity, ReceiptText, BadgeAlert, Clock3, Plus, Search, Filter,
    Pause, Play, Trash2, X, Check, ArrowRight
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
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    
    const [activeTab, setActiveTab] = useState<TabType>('subscriptions');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals
    const [printInvoice, setPrintInvoice] = useState<any | null>(null);
    const [showSubModal, setShowSubModal] = useState(false);
    const [showInvModal, setShowInvModal] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);

    // Form states
    const [subForm, setSubForm] = useState({
        customerId: '',
        productId: '',
        productName: '',
        billingCycle: 'MONTHLY',
        unitPrice: 999,
        quantity: 1,
        startDate: new Date().toISOString().split('T')[0]
    });

    const [invForm, setInvForm] = useState({
        customerId: '',
        invoiceType: 'ONE_TIME',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'UNPAID',
        lines: [
            { productName: '', description: '', quantity: 1, unitPrice: 0, lineTotal: 0, isRecurring: false }
        ]
    });

    const [creditForm, setCreditForm] = useState({
        customerId: '',
        invoiceId: '',
        amount: 500,
        reason: 'Commercial Adjustment / Credit Issue'
    });

    const [payForm, setPayForm] = useState({
        amount: 0,
        paymentMethod: 'BANK_TRANSFER',
        reference: ''
    });

    const [actionLoading, setActionLoading] = useState(false);
    const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
        setBannerMsg({ type, text });
        setTimeout(() => setBannerMsg(null), 4000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sumRes, subRes, invRes, creditRes, custRes, prodRes] = await Promise.all([
                client.get('/billing/summary'),
                client.get('/billing/subscriptions'),
                client.get('/billing/reconciliation'),
                client.get('/billing/credit-notes'),
                client.get('/config/customers').catch(() => ({ data: [] })),
                client.get('/config/products').catch(() => ({ data: [] })),
            ]);
            setSummary(sumRes.data);
            setSubscriptions(subRes.data);
            setInvoices(invRes.data);
            setCredits(creditRes.data);
            setCustomers(custRes.data || []);
            setProducts(prodRes.data || []);
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
            showNotification('Failed to load invoice details', 'error');
        }
    };

    // Subscriptions actions
    const handleToggleSubStatus = async (sub: any) => {
        const nextStatus = sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        try {
            await client.put(`/billing/subscriptions/${sub._id}`, { status: nextStatus });
            showNotification(`Subscription ${nextStatus === 'ACTIVE' ? 'resumed' : 'paused'} successfully`);
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to update subscription', 'error');
        }
    };

    const handleDeleteSub = async (subId: string) => {
        if (!window.confirm('Are you sure you want to delete this subscription and all its schedules?')) return;
        try {
            await client.delete(`/billing/subscriptions/${subId}`);
            showNotification('Subscription deleted successfully');
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to delete subscription', 'error');
        }
    };

    // Invoice actions
    const handleDeleteInvoice = async (invId: string) => {
        if (!window.confirm('Are you sure you want to delete/void this invoice?')) return;
        try {
            await client.delete(`/billing/invoices/${invId}`);
            showNotification('Invoice deleted successfully');
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to delete invoice', 'error');
        }
    };

    // Credit Note actions
    const handleDeleteCreditNote = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this credit note?')) return;
        try {
            await client.delete(`/billing/credit-notes/${id}`);
            showNotification('Credit note deleted successfully');
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to delete credit note', 'error');
        }
    };

    // Submit forms
    const handleCreateSub = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subForm.customerId) return alert('Please select a customer');
        setActionLoading(true);
        try {
            await client.post('/billing/subscriptions', {
                ...subForm,
                unitPrice: Number(subForm.unitPrice),
                quantity: Number(subForm.quantity)
            });
            setShowSubModal(false);
            showNotification('Subscription created successfully');
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to create subscription', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invForm.customerId) return alert('Please select a customer');
        setActionLoading(true);
        try {
            const subtotal = invForm.lines.reduce((acc, l) => acc + (Number(l.quantity) * Number(l.unitPrice)), 0);
            const taxTotal = Math.round(subtotal * 0.1);
            const grandTotal = subtotal + taxTotal;

            const payload = {
                customerId: invForm.customerId,
                invoiceType: invForm.invoiceType,
                dueDate: invForm.dueDate,
                status: invForm.status,
                lines: invForm.lines.map(l => ({
                    ...l,
                    lineTotal: Number(l.quantity) * Number(l.unitPrice)
                })),
                subtotal,
                taxTotal,
                grandTotal
            };

            await client.post('/billing/invoices', payload);
            setShowInvModal(false);
            showNotification('Invoice generated and saved in database');
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to create invoice', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateCreditNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!creditForm.customerId) return alert('Please select a customer');
        setActionLoading(true);
        try {
            await client.post('/billing/credit-notes', {
                customerId: creditForm.customerId,
                invoiceId: creditForm.invoiceId || undefined,
                amount: Number(creditForm.amount),
                reason: creditForm.reason
            });
            setShowCreditModal(false);
            showNotification('Credit note issued and persisted to database');
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to issue credit note', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentInvoice) return;
        setActionLoading(true);
        try {
            await client.post(`/billing/invoices/${paymentInvoice._id}/payment`, {
                amount: Number(payForm.amount),
                paymentMethod: payForm.paymentMethod,
                reference: payForm.reference || `TXN-${Date.now().toString().slice(-6)}`
            });
            setPaymentInvoice(null);
            showNotification('Payment recorded successfully. Balance & status updated in MongoDB!');
            fetchAll();
        } catch (err: any) {
            showNotification(err.response?.data?.error || 'Failed to record payment', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Filtered items
    const filteredSubs = useMemo(() => {
        return subscriptions.filter(s => {
            const matchesSearch = !searchTerm ||
                s.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.customerId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.productName?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [subscriptions, searchTerm, statusFilter]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = !searchTerm ||
                inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.customerId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchTerm, statusFilter]);

    const filteredCredits = useMemo(() => {
        return credits.filter(c => {
            const matchesSearch = !searchTerm ||
                c.creditNoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.reason?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [credits, searchTerm, statusFilter]);

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
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            prefix: '$',
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
            prefix: '$',
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
                {/* Notification Banner */}
                {bannerMsg && (
                    <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between border shadow-sm transition-all ${
                        bannerMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        <div className="flex items-center gap-2">
                            {bannerMsg.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                            <span>{bannerMsg.text}</span>
                        </div>
                        <button onClick={() => setBannerMsg(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Header & Quick Action Buttons */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription & Billing</h1>
                        <p className="text-slate-500 text-sm mt-1">Live database synchronization for recurring plans, invoices, reconciliation & credits</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={() => setShowSubModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4" /> New Subscription
                        </button>
                        <button
                            onClick={() => setShowInvModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all"
                        >
                            <FileText className="w-4 h-4 text-blue-600" /> Create Invoice
                        </button>
                        <button
                            onClick={() => setShowCreditModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all"
                        >
                            <ReceiptText className="w-4 h-4 text-purple-600" /> Issue Credit Note
                        </button>
                        <button
                            onClick={fetchAll}
                            title="Refresh from Database"
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
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

                {/* Main Table Container */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Tabs */}
                    <div className="flex gap-0 border-b border-slate-200 px-6 pt-4">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setStatusFilter('ALL'); }}
                                className={`pb-4 px-3 mr-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 font-semibold'
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

                    {/* Filter & Search Bar */}
                    <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by customer, plan, number..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="ALL">All Statuses</option>
                                {activeTab === 'subscriptions' && (
                                    <>
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="PAUSED">PAUSED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                        <option value="EXPIRED">EXPIRED</option>
                                    </>
                                )}
                                {activeTab === 'invoices' && (
                                    <>
                                        <option value="UNPAID">UNPAID</option>
                                        <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                                        <option value="PAID">PAID</option>
                                        <option value="OVERDUE">OVERDUE</option>
                                        <option value="VOID">VOID</option>
                                    </>
                                )}
                                {activeTab === 'credits' && (
                                    <>
                                        <option value="ISSUED">ISSUED</option>
                                        <option value="APPLIED">APPLIED</option>
                                        <option value="VOID">VOID</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Subscriptions Tab */}
                    {activeTab === 'subscriptions' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan / Product</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty × Price</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Billing</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubs.length === 0 && (
                                        <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">No subscriptions matching current criteria.</td></tr>
                                    )}
                                    {filteredSubs.map(sub => (
                                        <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900 text-sm">{sub.customerId?.name || '—'}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{sub.customerId?.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900 text-sm">{sub.productName}</p>
                                                <span className="text-xs text-blue-600 font-semibold uppercase">{sub.billingCycle}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {sub.quantity} × ${sub.unitPrice.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                                                ${(sub.quantity * sub.unitPrice).toLocaleString()}
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
                                                <div className="inline-flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleSubStatus(sub)}
                                                        title={sub.status === 'ACTIVE' ? 'Pause Subscription' : 'Resume Subscription'}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                                    >
                                                        {sub.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                                                    </button>
                                                    <Link
                                                        to={`/internal/billing/subscription/${sub._id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                                    >
                                                        Manage <ChevronRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteSub(sub._id)}
                                                        title="Delete Subscription"
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
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
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredInvoices.length === 0 && (
                                        <tr><td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400">No invoices matching current criteria.</td></tr>
                                    )}
                                    {filteredInvoices.map(inv => (
                                        <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
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
                                            <td className="px-6 py-4 font-bold text-slate-900 text-sm">${inv.grandTotal.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-emerald-600">${inv.amountPaid.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-red-600">${inv.amountDue.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[inv.status] || STATUS_STYLES.VOID}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    {inv.status !== 'PAID' && inv.amountDue > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setPaymentInvoice(inv);
                                                                setPayForm({
                                                                    amount: inv.amountDue,
                                                                    paymentMethod: 'BANK_TRANSFER',
                                                                    reference: `TXN-${Date.now().toString().slice(-6)}`
                                                                });
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                                                            title="Record Payment"
                                                        >
                                                            <DollarSign className="w-3.5 h-3.5" /> Pay
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openInvoicePrint(inv._id)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" /> Print
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteInvoice(inv._id)}
                                                        title="Delete/Void Invoice"
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
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
                                        <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCredits.length === 0 && (
                                        <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">No credit notes found.</td></tr>
                                    )}
                                    {filteredCredits.map((cn: any) => (
                                        <tr key={cn._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm font-semibold text-purple-700">{cn.creditNoteNumber}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900 text-sm">{cn.customerId?.name || '—'}</p>
                                                <p className="text-xs text-slate-400">{cn.customerId?.email}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{cn.reason}</td>
                                            <td className="px-6 py-4 font-bold text-purple-700 text-sm">${cn.amount.toLocaleString()}</td>
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
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteCreditNote(cn._id)}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Delete Credit Note"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: New Subscription */}
            {showSubModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" /> Create Subscription
                            </h2>
                            <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSub} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer *</label>
                                <select
                                    required
                                    value={subForm.customerId}
                                    onChange={e => setSubForm({ ...subForm, customerId: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    <option value="">Select Customer Account</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} ({c.email || c.company || 'Customer'})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Plan / Product Name *</label>
                                <div className="space-y-2">
                                    <select
                                        value={products.some(p => p.name === subForm.productName) ? subForm.productName : ''}
                                        onChange={e => {
                                            const prod = products.find(p => p.name === e.target.value);
                                            if (prod) {
                                                setSubForm({
                                                    ...subForm,
                                                    productId: prod._id,
                                                    productName: prod.name,
                                                    unitPrice: prod.basePrice || prod.price || subForm.unitPrice
                                                });
                                            }
                                        }}
                                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                                    >
                                        <option value="">Choose Catalog Product or Custom Below</option>
                                        {products.map(p => (
                                            <option key={p._id} value={p.name}>{p.name} (${(p.basePrice || p.price || 0).toLocaleString()})</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        required
                                        value={subForm.productName}
                                        onChange={e => setSubForm({ ...subForm, productName: e.target.value })}
                                        placeholder="e.g. Enterprise Cloud Storage 5TB"
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Billing Cycle</label>
                                    <select
                                        value={subForm.billingCycle}
                                        onChange={e => setSubForm({ ...subForm, billingCycle: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    >
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly</option>
                                        <option value="YEARLY">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
                                    <input
                                        type="date"
                                        value={subForm.startDate}
                                        onChange={e => setSubForm({ ...subForm, startDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={subForm.quantity}
                                        onChange={e => setSubForm({ ...subForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Unit Price ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={subForm.unitPrice}
                                        onChange={e => setSubForm({ ...subForm, unitPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Calculation Banner */}
                            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex justify-between items-center text-xs text-blue-900">
                                <span>Recurring Total ({subForm.billingCycle}):</span>
                                <span className="font-bold text-sm text-blue-700">${(subForm.quantity * subForm.unitPrice).toLocaleString()}</span>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowSubModal(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : 'Create Subscription'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Create Invoice */}
            {showInvModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" /> Generate New Invoice
                            </h2>
                            <button onClick={() => setShowInvModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer *</label>
                                    <select
                                        required
                                        value={invForm.customerId}
                                        onChange={e => setInvForm({ ...invForm, customerId: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    >
                                        <option value="">Select Customer Account</option>
                                        {customers.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.email || c.company || 'Customer'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Invoice Type</label>
                                    <select
                                        value={invForm.invoiceType}
                                        onChange={e => setInvForm({ ...invForm, invoiceType: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    >
                                        <option value="ONE_TIME">ONE_TIME</option>
                                        <option value="RECURRING">RECURRING</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Due Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={invForm.dueDate}
                                        onChange={e => setInvForm({ ...invForm, dueDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
                                    <select
                                        value={invForm.status}
                                        onChange={e => setInvForm({ ...invForm, status: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                    >
                                        <option value="UNPAID">UNPAID</option>
                                        <option value="PAID">PAID</option>
                                    </select>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Invoice Items</label>
                                    <button
                                        type="button"
                                        onClick={() => setInvForm({
                                            ...invForm,
                                            lines: [...invForm.lines, { productName: '', description: '', quantity: 1, unitPrice: 0, lineTotal: 0, isRecurring: false }]
                                        })}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {invForm.lines.map((line, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center text-sm">
                                            <div className="col-span-5">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Product or Service name"
                                                    value={line.productName}
                                                    onChange={e => {
                                                        const lines = [...invForm.lines];
                                                        lines[idx].productName = e.target.value;
                                                        setInvForm({ ...invForm, lines });
                                                    }}
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Qty"
                                                    value={line.quantity}
                                                    onChange={e => {
                                                        const lines = [...invForm.lines];
                                                        lines[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                                                        setInvForm({ ...invForm, lines });
                                                    }}
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Price $"
                                                    value={line.unitPrice}
                                                    onChange={e => {
                                                        const lines = [...invForm.lines];
                                                        lines[idx].unitPrice = parseFloat(e.target.value) || 0;
                                                        setInvForm({ ...invForm, lines });
                                                    }}
                                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div className="col-span-2 flex items-center justify-between text-xs font-bold text-slate-800">
                                                <span>${(line.quantity * line.unitPrice).toLocaleString()}</span>
                                                {invForm.lines.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const lines = invForm.lines.filter((_, i) => i !== idx);
                                                            setInvForm({ ...invForm, lines });
                                                        }}
                                                        className="text-slate-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary & Totals */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>${invForm.lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Tax (10%)</span>
                                    <span>${Math.round(invForm.lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0) * 0.1).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                                    <span>Grand Total</span>
                                    <span className="text-blue-600">
                                        ${Math.round(invForm.lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0) * 1.1).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowInvModal(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? 'Creating...' : 'Save & Issue Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Issue Credit Note */}
            {showCreditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ReceiptText className="w-5 h-5 text-purple-600" /> Issue Credit Note
                            </h2>
                            <button onClick={() => setShowCreditModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCreditNote} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer *</label>
                                <select
                                    required
                                    value={creditForm.customerId}
                                    onChange={e => setCreditForm({ ...creditForm, customerId: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                >
                                    <option value="">Select Customer Account</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} ({c.email || c.company || 'Customer'})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Credit Amount ($) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={creditForm.amount}
                                    onChange={e => setCreditForm({ ...creditForm, amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-purple-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason *</label>
                                <textarea
                                    rows={3}
                                    required
                                    value={creditForm.reason}
                                    onChange={e => setCreditForm({ ...creditForm, reason: e.target.value })}
                                    placeholder="e.g. Service level agreement credit, pricing correction, goodwill"
                                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreditModal(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? 'Issuing...' : 'Issue Credit Note'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Record Payment */}
            {paymentInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-600" /> Record Invoice Payment
                            </h2>
                            <button onClick={() => setPaymentInvoice(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Invoice:</span>
                                    <span className="font-mono font-bold text-slate-800">{paymentInvoice.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Customer:</span>
                                    <span className="font-semibold text-slate-800">{paymentInvoice.customerId?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Grand Total:</span>
                                    <span className="font-semibold text-slate-800">${paymentInvoice.grandTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Amount Due:</span>
                                    <span className="font-bold text-red-600">${paymentInvoice.amountDue.toLocaleString()}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Amount ($) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={paymentInvoice.amountDue}
                                    required
                                    value={payForm.amount}
                                    onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-700"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Method</label>
                                <select
                                    value={payForm.paymentMethod}
                                    onChange={e => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                                >
                                    <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                                    <option value="CREDIT_CARD">Credit Card / Debit Card</option>
                                    <option value="UPI">UPI / Instant Pay</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="CASH">Cash</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Transaction / Reference #</label>
                                <input
                                    type="text"
                                    value={payForm.reference}
                                    onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                                    placeholder="e.g. UTR-987654321"
                                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setPaymentInvoice(null)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? 'Recording...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
    const oneTimeLines = (invoice.lines || []).filter((l: any) => !l.isRecurring);
    const recurringLines = (invoice.lines || []).filter((l: any) => l.isRecurring);

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
                                                <td className="py-3 text-right text-slate-700">${line.unitPrice.toLocaleString()}</td>
                                                <td className="py-3 text-right font-bold text-slate-900">${line.lineTotal.toLocaleString()}</td>
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
                                                <td className="py-3 text-right text-slate-700">${line.unitPrice.toLocaleString()}</td>
                                                <td className="py-3 text-right font-bold text-slate-900">${line.lineTotal.toLocaleString()}</td>
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
                                        <span className="font-medium">${invoice.subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Tax (10%)</span>
                                        <span className="font-medium">${invoice.taxTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-emerald-700">
                                        <span>Amount Paid</span>
                                        <span className="font-semibold">– ${invoice.amountPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                                        <span>Balance Due</span>
                                        <span className="text-red-600">${invoice.amountDue.toLocaleString()}</span>
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
                                                <td className="py-2 text-right font-semibold text-emerald-700">${p.amount.toLocaleString()}</td>
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
