import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { 
    FileText, 
    Truck, 
    CreditCard, 
    RefreshCw, 
    Sparkles, 
    ChevronRight, 
    Package
} from 'lucide-react';

export default function CustomerDashboard() {
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<any>(null);
    const [quotations, setQuotations] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'quotes' | 'orders' | 'invoices' | 'subscriptions'>('quotes');
    const [quoteFilter, setQuoteFilter] = useState<'ALL' | 'SENT' | 'UNDER_NEGOTIATION' | 'CONFIRMED'>('ALL');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await client.get('/portal/dashboard');
                setCustomer(res.data.customer);
                setQuotations(res.data.quotations || []);
                setOrders(res.data.orders || []);
                setInvoices(res.data.invoices || []);
                setSubscriptions(res.data.subscriptions || []);
            } catch (err) {
                console.error('Failed to fetch portal dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">Loading your enterprise commercial center...</span>
            </div>
        );
    }

    // KPI Calculations
    const totalProposalValue = quotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
    const openInvoices = invoices.filter(i => i.status !== 'PAID');
    const totalAmountDue = openInvoices.reduce((acc, i) => acc + (i.amountDue || i.grandTotal || 0), 0);
    const activeSubMRR = subscriptions
        .filter(s => s.status === 'ACTIVE')
        .reduce((acc, s) => acc + (s.totalRecurringAmount || 0), 0);

    const filteredQuotes = quotations.filter(q => {
        if (quoteFilter === 'ALL') return true;
        return q.status === quoteFilter;
    });

    const tierName = customer?.tier?.name || 'Standard';
    const maxDiscount = customer?.tier?.maxDiscountPercent;

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto">
            {/* Top Customer Tier & Account Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                {/* Ambient glow effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                {tierName} Enterprise Partner
                            </span>
                            {maxDiscount !== undefined && (
                                <span className="text-[11px] text-amber-300/90 font-medium">
                                    • Up to {maxDiscount}% Pre-Approved Commercial Authority
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            {customer?.name || 'Enterprise Customer'}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                            Welcome to your dedicated commercial workspace. Review ongoing proposals, negotiate line-item discounts, monitor fulfillment logistics, and inspect recurring billing.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-right">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Account Terms</div>
                            <div className="text-sm font-bold text-white mt-0.5">Net 30 Billing</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4 KPI Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Commercial Proposals */}
                <div 
                    onClick={() => setActiveTab('quotes')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        activeTab === 'quotes' 
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-indigo-200 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Commercial Proposals</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                        {quotations.length}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>Pipeline Value</span>
                        <span className="font-semibold text-slate-700">${totalProposalValue.toLocaleString()}</span>
                    </div>
                </div>

                {/* Metric 2: Orders in Fulfillment */}
                <div 
                    onClick={() => setActiveTab('orders')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        activeTab === 'orders' 
                            ? 'bg-blue-50/70 border-blue-300 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-blue-200 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders & Shipments</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Truck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                        {orders.length}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>In Logistics</span>
                        <span className="font-semibold text-blue-600">
                            {orders.filter(o => o.status !== 'FULFILLED').length} Active
                        </span>
                    </div>
                </div>

                {/* Metric 3: Open Invoices */}
                <div 
                    onClick={() => setActiveTab('invoices')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        activeTab === 'invoices' 
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-amber-200 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Billed Invoices</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                        {invoices.length}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>Outstanding Due</span>
                        <span className="font-bold text-amber-700">${totalAmountDue.toLocaleString()}</span>
                    </div>
                </div>

                {/* Metric 4: Active SaaS Subscriptions */}
                <div 
                    onClick={() => setActiveTab('subscriptions')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        activeTab === 'subscriptions' 
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-emerald-200 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                        {subscriptions.length}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>Monthly Recurring</span>
                        <span className="font-semibold text-emerald-700">${activeSubMRR.toLocaleString()}/mo</span>
                    </div>
                </div>
            </div>

            {/* Segmented Navigation Tab Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 w-fit overflow-x-auto">
                <button
                    onClick={() => setActiveTab('quotes')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'quotes'
                            ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <FileText className="w-3.5 h-3.5" />
                    Commercial Proposals ({quotations.length})
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'orders'
                            ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Truck className="w-3.5 h-3.5" />
                    Orders & Shipments ({orders.length})
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'invoices'
                            ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <CreditCard className="w-3.5 h-3.5" />
                    Invoices & Statements ({invoices.length})
                </button>
                <button
                    onClick={() => setActiveTab('subscriptions')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'subscriptions'
                            ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    SaaS Subscriptions ({subscriptions.length})
                </button>
            </div>

            {/* TAB 1: COMMERCIAL PROPOSALS */}
            {activeTab === 'quotes' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Commercial Proposals & Quotations</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Review formal proposals from your sales representative, counter-offer line discounts, or confirm orders.
                            </p>
                        </div>
                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                            {(['ALL', 'SENT', 'UNDER_NEGOTIATION', 'CONFIRMED'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setQuoteFilter(tab)}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                                        quoteFilter === tab ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {tab === 'ALL' ? 'All Proposals' : tab.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        {filteredQuotes.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <div className="text-sm font-medium">No commercial proposals in this filter view.</div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredQuotes.map(q => {
                                    const isSent = q.status === 'SENT';
                                    const isNeg = q.status === 'UNDER_NEGOTIATION';
                                    const isConf = q.status === 'CONFIRMED';
                                    const isAppr = q.status === 'APPROVED';

                                    return (
                                        <div
                                            key={q.id}
                                            onClick={() => navigate(`/portal/quotations/${q.id}`)}
                                            className="p-5 border border-slate-200 hover:border-indigo-300 rounded-xl bg-white hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                                                    QT
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                                                            {q.quotationNumber}
                                                        </span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                            isConf ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            isNeg ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            isSent ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            isAppr ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
                                                            {isConf ? 'Confirmed & Closed' :
                                                             isNeg ? 'Under Negotiation' :
                                                             isSent ? 'Ready for Review' :
                                                             isAppr ? 'Approved' :
                                                             q.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                                                        <span>Issued: {new Date(q.createdAt || Date.now()).toLocaleDateString()}</span>
                                                        {q.validUntil && (
                                                            <span>• Valid until: <strong className="text-slate-700">{new Date(q.validUntil).toLocaleDateString()}</strong></span>
                                                        )}
                                                        {q.notes && (
                                                            <span className="hidden sm:inline text-slate-400 truncate max-w-md">• {q.notes}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                                <div className="text-left md:text-right">
                                                    <div className="text-lg font-black text-slate-900">
                                                        {q.currency || 'USD'} {q.totalAmount?.toLocaleString()}
                                                    </div>
                                                    {q.orderDiscountPercent > 0 && (
                                                        <div className="text-[11px] text-emerald-600 font-semibold">
                                                            Includes {q.orderDiscountPercent}% discount
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all border border-indigo-100">
                                                    <span>Review Proposal</span>
                                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: ORDERS & FULFILLMENT LOGISTICS */}
            {activeTab === 'orders' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-900">Order Fulfillment & Logistics</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Track warehouse allocations, partial shipments, and scheduled delivery milestones for confirmed orders.
                        </p>
                    </div>

                    <div className="p-6">
                        {orders.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <div className="text-sm font-medium">No sales orders currently scheduled for delivery.</div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {orders.map(o => {
                                    const isFulfilled = o.status === 'FULFILLED';
                                    const isPartial = o.status === 'PARTIALLY_FULFILLED';

                                    return (
                                        <div key={o._id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-xs flex flex-col gap-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                                        SO
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-extrabold text-slate-900 text-base">{o.orderNumber}</span>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                                isFulfilled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}>
                                                                {o.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            Ordered: {new Date(o.createdAt).toLocaleDateString()}
                                                            {o.promisedDeliveryDate && (
                                                                <span className="ml-2">• Promised Delivery: <strong>{new Date(o.promisedDeliveryDate).toLocaleDateString()}</strong></span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-lg font-black text-slate-900">
                                                        ${o.grandTotal?.toLocaleString()}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {o.orderLines?.length || 0} Line Items • {o.shipmentCount || 1} Shipments
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fulfillment Split Breakdown */}
                                            {o.fulfillmentPlan && o.fulfillmentPlan.length > 0 && (
                                                <div className="mt-1 pt-3 border-t border-slate-100">
                                                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                                        Warehouse Route Allocation
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {o.fulfillmentPlan.map((plan: any, idx: number) => (
                                                            <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
                                                                <div>
                                                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                                        <Package className="w-3.5 h-3.5 text-slate-400" />
                                                                        {plan.warehouseName || 'Distribution Hub'}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                                        {plan.isBackorder ? (
                                                                            <span className="text-amber-600 font-semibold">• Backorder Dispatch (Est: {plan.expectedDate ? new Date(plan.expectedDate).toLocaleDateString() : 'Pending'})</span>
                                                                        ) : (
                                                                            <span className="text-emerald-600 font-semibold">• Dispatched from Main Stock</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                    plan.status === 'SHIPPED' ? 'bg-emerald-100 text-emerald-800' :
                                                                    plan.status === 'RESERVED' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-slate-200 text-slate-700'
                                                                }`}>
                                                                    {plan.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: INVOICES & STATEMENTS */}
            {activeTab === 'invoices' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Commercial Invoices & Billing Statements</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                View generated tax invoices, payment records, and net settlement dates.
                            </p>
                        </div>
                    </div>

                    <div className="p-6">
                        {invoices.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <div className="text-sm font-medium">No invoices currently billed for this account.</div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                                            <th className="pb-3 font-bold">Invoice #</th>
                                            <th className="pb-3 font-bold">Type</th>
                                            <th className="pb-3 font-bold">Invoice Date</th>
                                            <th className="pb-3 font-bold">Due Date</th>
                                            <th className="pb-3 font-bold text-right">Total Amount</th>
                                            <th className="pb-3 font-bold text-right">Amount Due</th>
                                            <th className="pb-3 font-bold text-center">Status</th>
                                            <th className="pb-3 font-bold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {invoices.map(inv => {
                                            const isPaid = inv.status === 'PAID';
                                            const isOverdue = inv.status === 'OVERDUE';
                                            const isPartial = inv.status === 'PARTIALLY_PAID';

                                            return (
                                                <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                        {inv.invoiceNumber}
                                                    </td>
                                                    <td className="py-3.5">
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                                            {inv.invoiceType || 'COMMERCIAL'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 text-slate-500">
                                                        {new Date(inv.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3.5 text-slate-500">
                                                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Net 30'}
                                                    </td>
                                                    <td className="py-3.5 text-right font-bold text-slate-900">
                                                        ${inv.grandTotal?.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 text-right font-bold text-amber-700">
                                                        ${(inv.amountDue ?? (isPaid ? 0 : inv.grandTotal))?.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                            isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            isOverdue ? 'bg-red-50 text-red-700 border-red-200' :
                                                            isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'
                                                        }`}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 text-right">
                                                        <button
                                                            onClick={() => setSelectedInvoice(inv)}
                                                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 font-semibold transition-all cursor-pointer text-[11px]"
                                                        >
                                                            Inspect
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: SAAS & CLOUD SUBSCRIPTIONS */}
            {activeTab === 'subscriptions' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-900">Active Cloud & SaaS Subscriptions</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Recurring licenses, storage allocations, and continuous cloud service subscriptions.
                        </p>
                    </div>

                    <div className="p-6">
                        {subscriptions.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <RefreshCw className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <div className="text-sm font-medium">No recurring subscriptions under this contract.</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {subscriptions.map(sub => (
                                    <div key={sub._id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-xs flex flex-col justify-between gap-4">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                                                    {sub.billingCycle} Cycle
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                                    {sub.status}
                                                </span>
                                            </div>
                                            <h3 className="font-extrabold text-slate-900 text-base mt-2">
                                                {sub.productName}
                                            </h3>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Activated on {new Date(sub.startDate || Date.now()).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-semibold uppercase">Recurring Fee</div>
                                                <div className="text-base font-black text-slate-900">
                                                    ${sub.totalRecurringAmount?.toLocaleString()} <span className="text-xs font-normal text-slate-500">/{sub.billingCycle?.toLowerCase() === 'yearly' ? 'yr' : 'mo'}</span>
                                                </div>
                                            </div>

                                            {sub.nextBillingDate && (
                                                <div className="text-right">
                                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Next Renewal</div>
                                                    <div className="text-xs font-bold text-indigo-700">
                                                        {new Date(sub.nextBillingDate).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Invoice Inspection */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Invoice {selectedInvoice.invoiceNumber}</h3>
                                <p className="text-xs text-slate-400">Statement breakdown & payment status</p>
                            </div>
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                                {selectedInvoice.status}
                            </span>
                        </div>

                        <div className="py-4 space-y-3 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Billed To:</span>
                                <span className="font-semibold text-slate-800">{customer?.name}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Issue Date:</span>
                                <span className="font-semibold text-slate-800">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Due Date:</span>
                                <span className="font-semibold text-slate-800">{selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : 'Net 30'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Total Billed:</span>
                                <span className="font-bold text-slate-900">${selectedInvoice.grandTotal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Amount Paid:</span>
                                <span className="font-bold text-emerald-600">${(selectedInvoice.amountPaid || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between py-1 bg-amber-50 p-2 rounded-lg">
                                <span className="font-bold text-amber-900">Remaining Balance Due:</span>
                                <span className="font-black text-amber-900">${(selectedInvoice.amountDue ?? selectedInvoice.grandTotal)?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
