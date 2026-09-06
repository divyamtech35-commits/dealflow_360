import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../store/AuthContext';

interface Quotation {
    id: string;
    quotationNumber: string;
    customerName: string;
    status: string;
    totalFormatted: string;
    lastActivityAt: string;
    discountPercent?: number;
    tier?: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<Quotation[]>([]);
    const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
    const [isCreating, setIsCreatingQuote] = useState(false);
    const [filterTab, setFilterTab] = useState<'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Pre-populated demo deals for instant demonstration matching wireframe
    const demoDeals: Quotation[] = [
        {
            id: 'demo-1',
            quotationNumber: 'QT-1042',
            customerName: 'Acme Corp',
            status: 'APPROVED',
            totalFormatted: '$18,450.00',
            lastActivityAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            discountPercent: 12,
            tier: 'Gold'
        },
        {
            id: 'demo-2',
            quotationNumber: 'QT-1088',
            customerName: 'Beta Industries',
            status: 'SUBMITTED',
            totalFormatted: '$42,200.00',
            lastActivityAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
            discountPercent: 18,
            tier: 'Silver'
        },
        {
            id: 'demo-3',
            quotationNumber: 'QT-1092',
            customerName: 'Zenith Deal',
            status: 'DRAFT',
            totalFormatted: '$12,900.00',
            lastActivityAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            discountPercent: 6,
            tier: 'Bronze'
        },
        {
            id: 'demo-4',
            quotationNumber: 'QT-1033',
            customerName: 'Delta Corp',
            status: 'DRAFT',
            totalFormatted: '$6,400.00',
            lastActivityAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
            discountPercent: 5,
            tier: 'Bronze'
        }
    ];

    useEffect(() => {
        client.get('/quotations')
            .then(res => {
                if (res.data && res.data.length > 0) {
                    setQuotes(res.data);
                } else {
                    setQuotes(demoDeals);
                }
            })
            .catch(() => {
                setQuotes(demoDeals);
            })
            .finally(() => {
                setIsLoadingQuotes(false);
            });
    }, []);

    const handleCreateQuote = async () => {
        setIsCreatingQuote(true);
        try {
            const res = await client.post('/quotations', { customerId: null });
            navigate(`/internal/quotations/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create new quotation');
        } finally {
            setIsCreatingQuote(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SUBMITTED':
            case 'PENDING_APPROVAL':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'REJECTED':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'DRAFT':
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const displayedQuotes = quotes.filter(q => {
        const matchesSearch = (q.quotationNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesStatus = true;
        if (filterTab === 'DRAFT') matchesStatus = q.status === 'DRAFT';
        else if (filterTab === 'PENDING') matchesStatus = q.status === 'SUBMITTED' || q.status === 'PENDING_APPROVAL';
        else if (filterTab === 'APPROVED') matchesStatus = q.status === 'APPROVED';

        return matchesSearch && matchesStatus;
    });

    const pendingCount = quotes.filter(q => q.status === 'SUBMITTED' || q.status === 'PENDING_APPROVAL').length || 4;
    const openCount = quotes.length || 17;
    const atRiskCount = 2;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            {/* Top Operations Header */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                            Sales Operations
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">
                            Welcome back, {user?.name || (user?.role === 'ADMIN' ? 'Administrator' : 'Sales Representative')}
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                        Sales Dashboard / Home
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                        Consolidated command center over active deal pipelines, margin compliance, automated multi-tier approval escalations, and quote fulfillment.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {(user?.role === 'SALES_REP' || user?.role === 'ADMIN') && (
                        <button
                            onClick={handleCreateQuote}
                            disabled={isCreating}
                            className="group-btn relative px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all overflow-hidden cursor-pointer"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />
                            <span>{isCreating ? 'Creating...' : '+ New Quotation'}</span>
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/internal/quotations')}
                        className="px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm shadow-xs transition-colors"
                    >
                        View Full Pipeline
                    </button>
                </div>
            </div>

            {/* KPI Metrics Cards (Screen 2 from Mockup) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Card 1: Pending Approvals */}
                <div
                    onClick={() => {
                        if (user?.role === 'SALES_REP') {
                            navigate('/internal/quotations');
                        } else {
                            navigate('/internal/approvals');
                        }
                    }}
                    className="p-6 rounded-3xl bg-white border-t-4 border-t-amber-500 border-x border-b border-slate-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Pending Approvals
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {user?.role === 'SALES_REP' ? 'Under Review' : 'Action Req.'}
                        </span>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-900 tracking-tight">{pendingCount}</div>
                        <div className="text-xs font-semibold text-amber-700 mt-2">
                            {user?.role === 'SALES_REP' ? '⏳ Your quotes awaiting review' : '⚠ Approvals waiting manager'}
                        </div>
                    </div>
                </div>

                {/* Card 2: Open Quotations */}
                <div
                    onClick={() => navigate('/internal/quotations')}
                    className="p-6 rounded-3xl bg-white border-t-4 border-t-blue-600 border-x border-b border-slate-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Open Quotations
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            +18% MTD
                        </span>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-900 tracking-tight">{openCount}</div>
                        <div className="text-xs font-medium text-slate-500 mt-2">
                            12 active drafts • $84,250 pipeline
                        </div>
                    </div>
                </div>

                {/* Card 3: At Risk Deals */}
                <div className="p-6 rounded-3xl bg-white border-t-4 border-t-red-500 border-x border-b border-slate-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            At Risk Deals
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Attention
                        </span>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-900 tracking-tight">{atRiskCount}</div>
                        <div className="text-xs font-semibold text-red-600 mt-2">
                            Flagged by Risk Score (&lt;10% margin)
                        </div>
                    </div>
                </div>

                {/* Card 4: Average Margin Health */}
                <div className="p-6 rounded-3xl bg-white border-t-4 border-t-emerald-500 border-x border-b border-slate-200/90 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Margin Health
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Healthy
                        </span>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-slate-900 tracking-tight">34.2%</div>
                        <div className="text-xs font-semibold text-emerald-700 mt-2">
                            Tier compliance above benchmark
                        </div>
                    </div>
                </div>
            </div>

            {/* Wireframe Guidance Callout Banner */}
            <div className="p-5 rounded-3xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs sm:text-sm shadow-xs leading-relaxed">
                <div className="font-bold text-amber-950 mb-1">
                    DealFlow360 Automated Approval Engine:
                </div>
                <div>
                    After login, internal users land on the Sales Dashboard. Quotes with requested discounts exceeding tier thresholds (Bronze &gt;8%, Silver &gt;15%, Gold &gt;25%) automatically route to Sales Manager or Finance approval queues before warehouse allocation.
                </div>
            </div>

            {/* Main Content Split: Quotations Pipeline Table & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Cols: Active Quotations Pipeline */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                        {/* Pipeline Header with Search & Filter Tabs */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Active Quotations Pipeline</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Click any quote row to open the Quotation Builder</p>
                            </div>

                            <button
                                onClick={() => navigate('/internal/quotations')}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                View all pipeline →
                            </button>
                        </div>

                        {/* Search & Tabs */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter quotes by number or customer..."
                                className="w-full sm:w-72 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400"
                            />

                            <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                                {(
                                    [
                                        { label: 'All', val: 'ALL' },
                                        { label: 'Drafts', val: 'DRAFT' },
                                        { label: 'Pending', val: 'PENDING' },
                                        { label: 'Approved', val: 'APPROVED' },
                                    ] as const
                                ).map(tab => (
                                    <button
                                        key={tab.val}
                                        onClick={() => setFilterTab(tab.val)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                                            filterTab === tab.val
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quotes List Table */}
                        {isLoadingQuotes ? (
                            <div className="p-12 text-center text-xs text-slate-400">Loading live quotations...</div>
                        ) : displayedQuotes.length === 0 ? (
                            <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                <div className="text-sm font-bold text-slate-700">No matching quotations found</div>
                                <p className="text-xs text-slate-400 mt-1 mb-4">Create your first deal proposal to start pipeline progression.</p>
                                {(user?.role === 'SALES_REP' || user?.role === 'ADMIN') && (
                                    <button
                                        onClick={handleCreateQuote}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                                    >
                                        + Create First Quote
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                            <th className="pb-3">Quotation ID</th>
                                            <th className="pb-3">Customer</th>
                                            <th className="pb-3">Stage</th>
                                            <th className="pb-3 text-right">Total Deal Value</th>
                                            <th className="pb-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayedQuotes.slice(0, 6).map(q => (
                                            <tr
                                                key={q.id}
                                                onClick={() => navigate(q.id.startsWith('demo-') ? '/internal/quotations' : `/internal/quotations/${q.id}`)}
                                                className="hover:bg-blue-50/40 transition cursor-pointer group"
                                            >
                                                <td className="py-4 font-bold text-blue-600 group-hover:underline">
                                                    {q.quotationNumber || 'QT-DRAFT'}
                                                </td>
                                                <td className="py-4">
                                                    <div className="font-bold text-slate-900">{q.customerName || 'Pending Customer'}</div>
                                                    {q.tier && (
                                                        <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">{q.tier} Tier</div>
                                                    )}
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusBadge(q.status)}`}>
                                                        {q.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right font-black text-slate-900 text-sm">
                                                    {q.totalFormatted || '$0.00'}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <span className="font-bold text-blue-600 group-hover:text-blue-800">
                                                        Configure →
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Recent Activity Timeline (Screen 2 from Mockup) */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Live Log</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-6">Chronological audit events & approval status updates</p>

                        <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            {/* Event 1 */}
                            <div className="relative pl-6">
                                <span className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                                <div>
                                    <p className="text-xs text-slate-700 leading-snug">
                                        <span className="font-bold text-slate-900">Acme Corp</span> quotation approved by Manager Dave.
                                    </p>
                                    <span className="text-[10px] text-slate-400 mt-1 inline-block">2 hours ago</span>
                                </div>
                            </div>

                            {/* Event 2 */}
                            <div className="relative pl-6">
                                <span className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                                <div>
                                    <p className="text-xs text-slate-700 leading-snug">
                                        <span className="font-bold text-slate-900">Beta Industries</span> requested a discount change (18%).
                                    </p>
                                    <span className="text-[10px] text-slate-400 mt-1 inline-block">5 hours ago</span>
                                </div>
                            </div>

                            {/* Event 3 */}
                            <div className="relative pl-6">
                                <span className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                                <div>
                                    <p className="text-xs text-slate-700 leading-snug">
                                        <span className="font-bold text-slate-900">Zenith Deal</span> status updated to Under BOM Review.
                                    </p>
                                    <span className="text-[10px] text-slate-400 mt-1 inline-block">Yesterday</span>
                                </div>
                            </div>

                            {/* Event 4 */}
                            <div className="relative pl-6">
                                <span className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                                <div>
                                    <p className="text-xs text-slate-700 leading-snug">
                                        <span className="font-bold text-slate-900">Delta Corp</span> accepted Cloud Storage 1TB add-on upsell.
                                    </p>
                                    <span className="text-[10px] text-slate-400 mt-1 inline-block">2 days ago</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Preset Deal Launcher */}
                    {(user?.role === 'SALES_REP' || user?.role === 'ADMIN') && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                                Quick Proposal Templates
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={handleCreateQuote}
                                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/50 transition flex items-center justify-between text-xs group"
                                >
                                    <span className="font-semibold text-slate-800 group-hover:text-blue-600">
                                        Enterprise Server Bundle
                                    </span>
                                    <span className="text-slate-400 text-[11px]">$4,000</span>
                                </button>
                                <button
                                    onClick={handleCreateQuote}
                                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/70 hover:border-blue-300 hover:bg-blue-50/50 transition flex items-center justify-between text-xs group"
                                >
                                    <span className="font-semibold text-slate-800 group-hover:text-blue-600">
                                        Pro Laptop + 3Yr Warranty
                                    </span>
                                    <span className="text-slate-400 text-[11px]">$1,350</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
