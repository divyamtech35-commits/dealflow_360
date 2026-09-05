import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import AuditTimeline from '../components/AuditTimeline';

export default function ApprovalDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quote, setQuote] = useState<any>(null);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchQuote = async () => {
        try {
            const res = await client.get(`/quotations/${id}`);
            setQuote(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, [id]);

    const handleAction = async (action: 'approve' | 'reject' | 'return') => {
        if (!reason.trim()) {
            alert('A contextual reason is required before applying this decision.');
            return;
        }
        setIsSubmitting(true);
        try {
            await client.post(`/quotations/${id}/${action}`, { reason });
            navigate('/internal/approvals');
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to apply approval action.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!quote) {
        return (
            <div className="p-12 text-center text-slate-500 font-medium">
                Loading Deal Profile & Governance Chain...
            </div>
        );
    }

    const requiresFinance = quote.requiredApprovalSteps?.some((s: any) => s.role === 'FINANCE');

    const marginColor = quote.marginPct > 30 ? 'text-emerald-700' : quote.marginPct > 15 ? 'text-amber-700' : 'text-red-700';

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Top Deal Header */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={() => navigate('/internal/approvals')}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                            ← Back to Approval Queue
                        </button>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                            Executive Review
                        </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {quote.customerName || 'Enterprise Customer'}
                        </h1>
                        <span className="px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold">
                            {quote.quotationNumber}
                        </span>
                        <span className="px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold">
                            {quote.status}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Reviewing requested pricing exceptions and discount variances.
                    </div>
                </div>

                <div className="text-left md:text-right bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-2xl border md:border-0 border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Proposed Value</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                        {quote.totalFormatted || '$0.00'}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${marginColor}`}>
                        Deal Margin: {quote.marginPct?.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Split Review Workstation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT: Quotation Document & Line Variances (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                    Line-Item Policy Compliance
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Compare requested discounts against customer tier ceiling.
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-400">
                                {quote.lines?.length || 0} Items
                            </span>
                        </div>

                        <div className="space-y-3">
                            {quote.lines?.map((l: any) => (
                                <div
                                    key={l.id}
                                    className={`p-4 rounded-2xl border transition ${
                                        l.isViolation
                                            ? 'bg-red-50/60 border-red-200'
                                            : 'bg-slate-50/70 border-slate-200/80'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className={`text-sm font-bold ${l.isViolation ? 'text-red-700' : 'text-slate-900'}`}>
                                                {l.productName}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                Qty: <span className="font-semibold text-slate-700">{l.quantity}</span> • Unit Base: <span className="font-semibold text-slate-700">{l.unitPriceFormatted}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 mt-1">
                                                Policy Allowed: <span className="font-semibold">{l.allowedPercent}%</span> — Rep Requested: <span className="font-bold text-slate-900">{l.discountPercent}%</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-base font-black text-slate-900">{l.lineTotalFormatted}</div>
                                            {l.isViolation ? (
                                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                                    +{l.overagePercent?.toFixed(1)}% Variance
                                                </span>
                                            ) : (
                                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                    Compliant
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Integrated Audit Trail */}
                    <AuditTimeline quoteId={quote.id} />
                </div>

                {/* RIGHT: Approval Action Centre (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1">
                            Approval Governance Chain
                        </h3>
                        <p className="text-xs text-slate-500">
                            Multi-level authorization chain based on policy risk score.
                        </p>
                    </div>

                    {/* Evaluated Risk Score Gauge */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Evaluated Risk Score
                            </span>
                            <span className={`text-2xl font-black ${quote.riskScore >= 15 ? 'text-red-600' : quote.riskScore > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {quote.riskScore || 0}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${quote.riskScore >= 15 ? 'bg-red-500' : quote.riskScore > 0 ? 'bg-amber-500' : 'bg-emerald-500'} transition-all`}
                                style={{ width: `${Math.min(((quote.riskScore || 0) / 20) * 100, 100)}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2">
                            {quote.riskScore >= 15
                                ? 'High Risk (>15): Requires both Sales Manager and Finance sign-off'
                                : quote.riskScore > 0
                                ? 'Medium Variance (1-14): Requires Sales Manager sign-off'
                                : 'Compliant (0): Eligible for auto-approval'}
                        </div>
                    </div>

                    {/* Sequential Workflow Stepper */}
                    <div className="space-y-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Workflow Stages
                        </div>

                        {quote.requiredApprovalSteps?.map((step: any, idx: number) => {
                            if (step.role === 'FINANCE' && !requiresFinance && step.status !== 'APPROVED') return null;

                            const isApproved = step.status === 'APPROVED';
                            const isPending = step.status === 'PENDING';

                            return (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition ${
                                        isApproved
                                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                            : isPending
                                            ? 'bg-amber-50/70 border-amber-300 text-amber-950 shadow-xs'
                                            : 'bg-slate-50/50 border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                            isApproved
                                                ? 'bg-emerald-600 text-white'
                                                : isPending
                                                ? 'bg-amber-500 text-white animate-pulse'
                                                : 'bg-slate-200 text-slate-500'
                                        }`}
                                    >
                                        {isApproved ? '✓' : idx + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-xs text-slate-900 truncate">
                                            {step.role.replace('_', ' ')} Sign-off
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            Status: <span className="font-semibold uppercase">{step.status}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Decision Actions & Reason Capture */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                                Contextual Decision Reason *
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={3}
                                placeholder="Enter rationale for approving, returning, or rejecting this quote..."
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400"
                            />
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={() => handleAction('approve')}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                            >
                                Approve Deal
                            </button>
                            <button
                                onClick={() => handleAction('return')}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                            >
                                Return for Revision
                            </button>
                        </div>

                        <button
                            onClick={() => handleAction('reject')}
                            disabled={isSubmitting}
                            className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                            Hard Reject (Terminal)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

