import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import AuditTimeline from '../components/AuditTimeline';

export default function ApprovalDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quote, setQuote] = useState<any>(null);
    const [reason, setReason] = useState('');

    const fetchQuote = async () => {
        try {
            const res = await client.get(`/quotations/${id}`);
            setQuote(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchQuote(); }, [id]);

    const handleAction = async (action: 'approve' | 'reject' | 'return') => {
        if (!reason) return alert('A reason is required before modifying approval state.');
        try {
            await client.post(`/quotations/${id}/${action}`, { reason });
            navigate('/internal/approvals');
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to apply action.');
        }
    };

    if (!quote) return <div className="p-8 text-white">Loading Deal Profile...</div>;

    const requiresFinance = quote.requiredApprovalSteps?.some((s: any) => s.role === 'FINANCE');

    return (
        <div className="h-full text-slate-300 gap-6 flex">
            {/* LEFT: Quotation Document Details */}
            <div className="flex-1 bg-[#1A1A1A] border border-white/10 p-8 rounded-xl overflow-y-auto">
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                    <div>
                        <div className="text-xl font-bold text-white">{quote.customerName}</div>
                        <div className="text-slate-400">{quote.quotationNumber}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-white">{quote.totalFormatted}</div>
                        <div className="text-emerald-400 font-bold mt-1">Margin: {quote.marginPct.toFixed(1)}%</div>
                    </div>
                </div>

                <div className="space-y-3 mb-8">
                    <h3 className="text-sm uppercase font-bold text-slate-400 mb-4">Line Violations & Profile</h3>
                    {quote.lines?.map((l: any) => (
                        <div key={l.id} className={`p-4 rounded border flex justify-between ${l.isViolation ? 'bg-red-500/10 border-red-500/30' : 'bg-[#252525] border-white/10'}`}>
                            <div>
                                <div className={`font-bold ${l.isViolation ? 'text-red-400' : 'text-white'}`}>{l.productName}</div>
                                <div className="text-sm text-slate-400 mt-1">Allowed: {l.allowedPercent}% — Given: {l.discountPercent}%</div>
                            </div>
                            <div className="text-right">
                                <div className="text-white font-bold">{l.lineTotalFormatted}</div>
                                {l.isViolation && <div className="text-xs text-red-400 font-bold mt-1">({l.overagePercent.toFixed(1)}% Overage)</div>}
                            </div>
                        </div>
                    ))}
                </div>

                <AuditTimeline quoteId={quote.id} />
            </div>

            {/* RIGHT: Approval Action Centre */}
            <div className="w-1/3 flex flex-col gap-6">

                <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Approval Routing</h3>

                    {/* Risk Gauge */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-bold uppercase">Evaluated Risk Score</span>
                        <span className="text-amber-500 font-black text-2xl">{quote.riskScore}</span>
                    </div>
                    <div className="w-full h-2 bg-[#252525] rounded-full mb-8 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${Math.min((quote.riskScore / 20) * 100, 100)}%` }}></div>
                    </div>

                    {/* Visual Stepper */}
                    <div className="flex flex-col gap-4 mb-8">
                        {quote.requiredApprovalSteps?.map((step: any, idx: number) => {
                            if (step.role === 'FINANCE' && !requiresFinance && step.status !== 'APPROVED') return null; // HIDDEN if not required
                            return (
                                <div key={idx} className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${step.status === 'APPROVED' ? 'bg-emerald-500 text-white' :
                                        step.status === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-[#252525] text-slate-500'
                                        }`}>
                                        {step.status === 'APPROVED' ? '✓' : idx + 1}
                                    </div>
                                    <div>
                                        <div className={`font-bold ${step.status === 'PENDING' ? 'text-amber-500' : 'text-white'}`}>{step.role.replace('_', ' ')}</div>
                                        <div className="text-xs text-slate-400">{step.status}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Decision Actions */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Contextual Reason</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="w-full bg-[#121212] border border-white/20 rounded p-3 text-white text-sm"
                                rows={3}
                                placeholder="Must provide a reason to authorize or reject this variance..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => handleAction('approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition">
                                Approve
                            </button>
                            <button onClick={() => handleAction('return')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded transition">
                                Return
                            </button>
                        </div>
                        <button onClick={() => handleAction('reject')} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition mt-2">
                            Hard Reject (Terminal)
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
