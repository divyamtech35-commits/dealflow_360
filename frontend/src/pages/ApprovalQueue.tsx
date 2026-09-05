import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../store/AuthContext';

export default function ApprovalQueue() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setIsLoading(true);
        client.get('/approvals/queue')
            .then(r => setQuotes(r.data || []))
            .catch(e => console.error(e))
            .finally(() => setIsLoading(false));
    }, []);

    const filteredQuotes = quotes.filter(q => {
        const matchesNumber = (q.quotationNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCustomer = (q.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesNumber || matchesCustomer;
    });

    const highRiskCount = quotes.filter(q => (q.riskScore || 0) >= 15).length;
    const totalPipelineValue = quotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

    const getRiskBadge = (score: number) => {
        if (score >= 15) {
            return {
                style: 'bg-red-50 text-red-700 border-red-200',
                label: `High Risk (Score: ${score})`
            };
        }
        if (score > 0) {
            return {
                style: 'bg-amber-50 text-amber-700 border-amber-200',
                label: `Variance (Score: ${score})`
            };
        }
        return {
            style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            label: 'Compliant'
        };
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            {/* Header */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Governance Engine
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">
                            Role: {user?.role?.replace('_', ' ') || 'Manager'}
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Approval Queue
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                        Quotations requiring explicit sign-off based on discount policy overrides and customer tier thresholds.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/internal/quotations')}
                        className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition"
                    >
                        View All Quotes
                    </button>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-6 rounded-3xl bg-white border-t-4 border-t-amber-500 border-x border-b border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Pending Sign-off
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Active
                        </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{quotes.length}</div>
                    <p className="text-xs text-slate-500 mt-1">Quotations assigned to your role</p>
                </div>

                <div className="p-6 rounded-3xl bg-white border-t-4 border-t-red-500 border-x border-b border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Critical Risk Deals
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            High Variance
                        </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{highRiskCount}</div>
                    <p className="text-xs text-slate-500 mt-1">Risk score &gt;= 15 (Finance required)</p>
                </div>

                <div className="p-6 rounded-3xl bg-white border-t-4 border-t-blue-600 border-x border-b border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Total Pipeline Value
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Pending
                        </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">
                        ${totalPipelineValue > 0 ? totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Total value pending sign-off</p>
                </div>
            </div>

            {/* Filter Search Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search approval queue by quote number or customer name..."
                    className="w-full px-4 py-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition"
                />
            </div>

            {/* Queue Cards Grid */}
            {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading pending approval queue...</div>
            ) : filteredQuotes.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <h3 className="text-base font-bold text-slate-800">Your Approval Queue is Clear</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        There are currently no deal exceptions or quotations pending your role's sign-off.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredQuotes.map(q => {
                        const riskBadge = getRiskBadge(q.riskScore || 0);
                        const waitHours = q.lastActivityAt
                            ? Math.max(0, Math.floor((Date.now() - new Date(q.lastActivityAt).getTime()) / (1000 * 60 * 60)))
                            : 0;

                        return (
                            <div
                                key={q.id}
                                onClick={() => navigate(`/internal/approvals/${q.id}`)}
                                className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-amber-300 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-blue-600 tracking-wider">
                                            {q.quotationNumber || 'QT-PENDING'}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${riskBadge.style}`}>
                                            {riskBadge.label}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                                        {q.customerName || 'Enterprise Client'}
                                    </h3>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Waiting: <span className="font-semibold text-slate-600">{waitHours}h elapsed</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Deal Value</div>
                                        <div className="text-xl font-black text-slate-900">
                                            {q.totalFormatted || '$0.00'}
                                        </div>
                                    </div>

                                    <div className="text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                                        Review Deal →
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

