import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function PortalView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quote, setQuote] = useState<any>(null);
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmSuccess, setConfirmSuccess] = useState<any>(null);

    // Negotiation action state
    const [activeLine, setActiveLine] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [discountAmount, setDiscountAmount] = useState<number | ''>('');

    const fetchPortalData = async () => {
        try {
            const res = await client.get(`/portal/quotations/${id}`);
            setQuote(res.data.quotation);
            setThreads(res.data.negotiations || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortalData();
    }, [id]);

    const postAction = async (type: 'comment' | 'counter') => {
        try {
            const payload = type === 'comment'
                ? { lineId: activeLine, message: commentText }
                : { lineId: activeLine, requestedDiscountPercent: Number(discountAmount), message: commentText };

            await client.post(`/portal/quotations/${id}/${type}`, payload);

            setCommentText('');
            setDiscountAmount('');
            setActiveLine(null);
            fetchPortalData();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const confirmQuotation = async () => {
        if (!confirm('Are you sure you want to confirm these terms?')) return;
        try {
            const res = await client.post(`/portal/quotations/${id}/confirm`);
            setConfirmSuccess(res.data);
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (loading) return <div className="text-slate-500 animate-pulse text-center mt-20">Loading Secure Environment...</div>;
    if (error) return (
        <div className="max-w-md mx-auto mt-20 bg-red-50 p-6 rounded-xl border border-red-100 text-center">
            <h2 className="text-red-800 font-bold text-lg mb-2">Access Denied</h2>
            <p className="text-red-600">{error}</p>
        </div>
    );

    if (confirmSuccess) {
        return (
            <div className="max-w-xl mx-auto mt-12 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-center p-12">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                    ✓
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Quotation Confirmed!</h2>
                {confirmSuccess.status === 'PENDING_APPROVAL' ? (
                    <p className="text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100 font-medium">
                        Thank you for accepting the terms! Due to the applied discounts, this order has been routed to our management team for a final sign-off. We will notify you once it clears.
                    </p>
                ) : (
                    <p className="text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-100 font-medium">
                        Excellent! Your order has been placed into our fulfillment pipeline seamlessly. An invoice will follow shortly.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <button onClick={() => navigate('/portal/dashboard')} className="text-xs text-slate-500 hover:text-slate-800 mb-2">← Back to Dashboard</button>
                            <h1 className="text-2xl font-bold text-slate-800">Quotation {quote.quotationNumber}</h1>
                            {quote.validUntil && (
                                <p className="text-slate-500 text-sm mt-1">Valid until {new Date(quote.validUntil).toLocaleDateString()}</p>
                            )}
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${quote.status === 'UNDER_NEGOTIATION' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {quote.status}
                        </div>
                    </div>

                    <div className="p-6">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                                    <th className="pb-3">Product</th>
                                    <th className="pb-3 text-right">Qty</th>
                                    <th className="pb-3 text-right">Unit Price</th>
                                    <th className="pb-3 text-right">Total</th>
                                    <th className="pb-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {quote.lines.map((l: any) => (
                                    <tr key={l.id} className="text-sm">
                                        <td className="py-4 font-medium text-slate-800">{l.productName}</td>
                                        <td className="py-4 text-right">{l.quantity}</td>
                                        <td className="py-4 text-right">
                                            {l.discountPercent > 0 && <span className="text-emerald-500 text-xs mr-2 border border-emerald-200 bg-emerald-50 px-1 rounded">-{l.discountPercent}%</span>}
                                            {quote.currency} {Number(l.unitPrice || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 text-right font-semibold text-slate-700">{quote.currency} {Number(l.lineTotal || 0).toLocaleString()}</td>
                                        <td className="py-4 text-right">
                                            <button onClick={() => setActiveLine(l.id)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-md transition-colors text-xs font-semibold">
                                                Discuss
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Subtotal Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 flex flex-col items-end">
                    <div className="flex justify-between w-64 text-sm text-slate-600 mb-2">
                        <span>Subtotal</span>
                        <span>{quote.currency} {Number(quote.subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between w-64 text-sm text-slate-600 mb-2 border-b border-slate-100 pb-2">
                        <span>Tax</span>
                        <span>{quote.currency} {Number(quote.taxAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between w-64 text-xl font-bold text-slate-800 pt-2">
                        <span>Grand Total</span>
                        <span>{quote.currency} {Number(quote.totalAmount || 0).toLocaleString()}</span>
                    </div>

                    <button
                        onClick={confirmQuotation}
                        className="mt-6 w-64 bg-indigo-600 text-white font-semibold py-3 rounded-xl shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:bg-indigo-700 hover:-translate-y-0.5 transition-all outline-none"
                    >
                        Confirm Quotation
                    </button>
                    <p className="text-xs text-slate-400 w-64 text-center mt-3">By confirming, you accept the stated terms.</p>
                </div>
            </div>

            {/* Right Pane: Negotiations / Actions */}
            {quote.status !== 'CONFIRMED' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
                    <h3 className="font-bold text-slate-800 mb-4">Negotiation Thread</h3>

                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                        {threads.length === 0 && (
                            <div className="text-center text-slate-400 text-sm mt-10">No active discussions.</div>
                        )}
                    {threads.map(t => {
                        const isRep = t.actorType === 'REP';
                        return (
                            <div key={t._id} className={`flex flex-col ${isRep ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${isRep
                                        ? 'bg-slate-800 text-white rounded-br-sm'
                                        : 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-bl-sm'
                                    }`}>
                                    {t.type === 'COUNTER_DISCOUNT' && (
                                        <div className={`text-xs font-bold mb-1 ${isRep ? 'text-slate-300' : 'text-indigo-600'}`}>
                                            Proposed {t.requestedDiscountPercent}% discount
                                        </div>
                                    )}
                                    {t.message}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 px-1">
                                    {isRep ? 'Your Representative' : 'You'} &bull; {new Date(t.createdAt).toLocaleTimeString()}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="border-t border-slate-100 pt-4">
                    {activeLine ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 relative">
                            <button onClick={() => setActiveLine(null)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">✕</button>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Targeting specific line</span>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500 mb-2">Quote-level request</div>
                    )}

                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Leave a comment or justification..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-500 outline-none mb-3 resize-none h-20"
                    />

                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(Number(e.target.value))}
                            placeholder="% Discount"
                            className="w-28 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-500 outline-none"
                        />
                        <button
                            onClick={() => postAction(discountAmount ? 'counter' : 'comment')}
                            disabled={!commentText}
                            className="flex-1 bg-slate-800 text-white rounded-xl font-semibold shadow-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                            {discountAmount ? 'Send Counter' : 'Send Comment'}
                        </button>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
}
