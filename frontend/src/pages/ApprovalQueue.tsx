import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../store/AuthContext';

interface ApprovalQueueProps {
    defaultView?: 'QUEUE' | 'HEALTH';
}

export default function ApprovalQueue({ defaultView = 'QUEUE' }: ApprovalQueueProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState<'QUEUE' | 'HEALTH'>(defaultView);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [allQuotes, setAllQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (defaultView) {
            setActiveView(defaultView);
        }
    }, [defaultView]);

    useEffect(() => {
        setIsLoading(true);
        if (activeView === 'HEALTH') {
            client.get('/quotations')
                .then(r => setAllQuotes(r.data || []))
                .catch(e => console.error(e))
                .finally(() => setIsLoading(false));
        } else {
            client.get('/approvals/queue')
                .then(r => setQuotes(r.data || []))
                .catch(e => console.error(e))
                .finally(() => setIsLoading(false));
        }
    }, [activeView]);

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
                            {activeView === 'HEALTH' ? `${allQuotes.length} Deals Tracked` : `${quotes.length} Deals Pending Review`}
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {activeView === 'HEALTH' ? 'Deal Health Matrix' : 'Approval Queue'}
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                        {activeView === 'HEALTH'
                            ? 'Real-time margin health analysis, discount variance governance, and risk audit scoring.'
                            : 'Quotations requiring explicit sign-off based on discount policy overrides and customer tier thresholds.'}
                    </p>
                </div>
            </div>

            {/* VIEW 1: PENDING APPROVALS QUEUE */}
            {activeView === 'QUEUE' && (
                <>
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
                    {quotes.length > 0 && (
                        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search approval queue by quote number or customer name..."
                                className="w-full px-4 py-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition"
                            />
                        </div>
                    )}

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
                </>
            )}

            {/* VIEW 2: DEAL HEALTH MATRIX */}
            {activeView === 'HEALTH' && (
                <div className="space-y-6">
                    {/* Deal Health KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="p-6 rounded-3xl bg-white border-t-4 border-t-emerald-500 border-x border-b border-slate-200/90 shadow-xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Compliant Pipeline
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Healthy Margins
                                </span>
                            </div>
                            <div className="text-3xl font-black text-slate-900">
                                {allQuotes.filter(q => (q.riskScore || 0) === 0).length}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Deals matching standard tier discount allowances</p>
                        </div>

                        <div className="p-6 rounded-3xl bg-white border-t-4 border-t-amber-500 border-x border-b border-slate-200/90 shadow-xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Policy Variance Deals
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Manager Review
                                </span>
                            </div>
                            <div className="text-3xl font-black text-slate-900">
                                {allQuotes.filter(q => (q.riskScore || 0) > 0 && (q.riskScore || 0) < 15).length}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Discretionary discount overrides pending review</p>
                        </div>

                        <div className="p-6 rounded-3xl bg-white border-t-4 border-t-red-500 border-x border-b border-slate-200/90 shadow-xs">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Critical Escalations
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                    Finance Escalated
                                </span>
                            </div>
                            <div className="text-3xl font-black text-slate-900">
                                {allQuotes.filter(q => (q.riskScore || 0) >= 15).length}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Floor margins &lt; 15% or discount exceeding caps</p>
                        </div>
                    </div>

                    {/* Governance Health Matrix Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Deal Health & Governance Audit Matrix</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Comprehensive deal risk analysis, discount policy audits, and escalation pathways</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    Total Deals Tracked: {allQuotes.length}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                        <th className="pb-3">Quotation #</th>
                                        <th className="pb-3">Customer Account</th>
                                        <th className="pb-3 text-right">Deal Value</th>
                                        <th className="pb-3 text-right">Blended Margin</th>
                                        <th className="pb-3 text-center">Governance Status</th>
                                        <th className="pb-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allQuotes.length === 0 && !isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                                                No quotations found for health audit tracking.
                                            </td>
                                        </tr>
                                    ) : (
                                        allQuotes.map(q => {
                                            const score = q.riskScore || 0;
                                            const margin = q.marginPct !== undefined && q.marginPct !== null ? Number(q.marginPct) : null;
                                            return (
                                                <tr key={q.id || q._id} className="hover:bg-slate-50/60 transition">
                                                    <td className="py-3.5 font-mono font-bold text-blue-600">
                                                        {q.quotationNumber || 'QT-DRAFT'}
                                                    </td>
                                                    <td className="py-3.5 font-bold text-slate-900">
                                                        {q.customerName || q.customerId?.name || 'Enterprise Account'}
                                                    </td>
                                                    <td className="py-3.5 text-right font-black text-slate-900">
                                                        {q.totalFormatted || `$${(q.totalAmount || 0).toLocaleString()}`}
                                                    </td>
                                                    <td className="py-3.5 text-right">
                                                        {margin !== null ? (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                margin >= 30
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : margin >= 15
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                                {margin.toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 font-mono">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                            score >= 15
                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                : score > 0
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}>
                                                            <span>{score >= 15 ? 'Finance Escalation' : score > 0 ? 'Manager Review' : 'Compliant'}</span>
                                                            <span className="opacity-60 font-mono">({score} pts)</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 text-right">
                                                        <button
                                                            onClick={() => navigate(score > 0 ? `/internal/approvals/${q.id || q._id}` : `/internal/quotations/${q.id || q._id}`)}
                                                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[10px] transition cursor-pointer"
                                                        >
                                                            Inspect →
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

