import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';

export default function QuotationBuilder() {
    const { id } = useParams();
    const [quote, setQuote] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('Hardware');
    const [search, setSearch] = useState('');
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

    const fetchQuote = async () => {
        try {
            const res = await client.get(`/quotations/${id}`);
            setQuote(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchProducts = async () => {
        try {
            const res = await client.get(`/config/products?search=${search}`);
            setProducts(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchQuote(); fetchProducts(); }, [id, search]);

    useEffect(() => {
        if (quote) {
            client.get(`/quotations/${id}/suggestions`).then(res => setSuggestions(res.data)).catch(console.error);
        }
    }, [quote?.lines, id]);

    const addLine = async (p: any) => {
        const backup = { ...quote };
        setQuote({ ...quote, lines: [...(quote.lines || []), { productId: p._id, productName: p.name, quantity: 1, discountPercent: 0, lineTotalFormatted: '...' }] });
        try {
            const res = await client.post(`/quotations/${id}/lines`, { productId: p._id, quantity: 1, discountPercent: 0 });
            setQuote(res.data);
        } catch (e) { setQuote(backup); alert('Failed to add line'); }
    };

    const updateLine = async (lineId: string, quantity: number, discountPercent: number) => {
        if (quantity < 1 || discountPercent < 0 || discountPercent > 100) return;
        try {
            const res = await client.patch(`/quotations/${id}/lines/${lineId}`, { quantity, discountPercent });
            setQuote(res.data);
        } catch (e) { alert('Failed updating'); }
    };

    const removeLine = async (lineId: string) => {
        try {
            const res = await client.delete(`/quotations/${id}/lines/${lineId}`);
            setQuote(res.data);
        } catch (e) { alert('Failed removing line'); }
    };

    if (!quote) return <div className="p-8 text-white">Loading Workspace...</div>;

    let riskBadgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    let riskBadgeText = 'No approval needed';
    if (quote.requiredApprovalSteps?.includes('FINANCE')) {
        riskBadgeColor = 'bg-red-500/20 text-red-500 border-red-500/50';
        riskBadgeText = 'Manager + Finance required';
    } else if (quote.requiredApprovalSteps?.includes('SALES_MANAGER')) {
        riskBadgeColor = 'bg-amber-500/20 text-amber-500 border-amber-500/50';
        riskBadgeText = 'Manager approval required';
    }

    const marginColor = quote.marginPct > 30 ? 'bg-green-500' : quote.marginPct > 15 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="flex h-full text-slate-300 gap-6 relative">
            {showRiskModal && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
                    <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/20 w-full max-w-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold text-white">Blended Risk Engine Breakdown</h2>
                            <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
                        </div>

                        <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto">
                            {quote.lines?.map((l: any) => (
                                <div key={l.id} className={`p-4 rounded border ${l.isViolation ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'} flex justify-between`}>
                                    <div>
                                        <div className={`font-bold ${l.isViolation ? 'text-red-400' : 'text-white'}`}>{l.productName}</div>
                                        <div className="text-sm text-slate-400 mt-1">Given: {l.discountPercent}% vs Allowed: {l.allowedPercent}%</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold text-lg ${l.isViolation ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {l.overagePercent > 0 ? `+${l.overagePercent.toFixed(1)} overage` : 'Compliant'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-[#121212] p-4 rounded-lg flex items-center justify-between border border-white/10">
                            <div>
                                <div className="text-slate-400 text-sm">Policy Weights</div>
                                <div className="text-white font-mono mt-1">60% Blended / 40% Worst Line</div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div className="text-center px-4 border-r border-white/10">
                                    <div className="text-slate-400 text-sm">Violations</div>
                                    <div className="text-white font-bold text-lg">{quote.violationCount}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-sm">Final Risk Score</div>
                                    <div className="text-amber-500 font-bold text-2xl">{quote.riskScore}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LEFT: Product Picker */}
            <div className="w-[30%] flex flex-col bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white mb-3">Product Catalog</h2>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full p-2 mb-3 rounded bg-white/5 border border-white/10 text-white text-sm" />
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {['Hardware', 'Services', 'Subscriptions'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 rounded-full text-xs font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white/10'}`}>{tab}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {products.filter(p => !p.categoryId || p.categoryId.name === activeTab).map(p => (
                        <div key={p._id} className="p-3 bg-white/5 border border-white/5 rounded flex justify-between items-center hover:bg-white/10">
                            <div>
                                <div className="text-white font-medium text-sm">{p.name}</div>
                                <div className="text-xs text-blue-400">${p.basePrice}</div>
                            </div>
                            <button onClick={() => addLine(p)} className="px-3 py-1 bg-white/10 rounded hover:bg-blue-600 text-white">+</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTRE: Cart */}
            <div className="flex-1 flex flex-col bg-[#1A1A1A] border border-white/10 rounded-xl p-6 overflow-y-auto">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-white">{quote.customerName} - {quote.quotationNumber}</h2>

                    <button onClick={() => setShowRiskModal(true)} className={`px-3 py-1.5 border rounded-lg text-sm font-semibold shadow-sm transition hover:scale-105 cursor-pointer flex items-center gap-2 ${riskBadgeColor}`}>
                        <div className={`w-2 h-2 rounded-full ${quote.riskScore > 0 ? (quote.requiredApprovalSteps?.includes('FINANCE') ? 'bg-red-500' : 'bg-amber-500') : 'bg-emerald-500'}`} />
                        {riskBadgeText} (Score: {quote.riskScore})
                    </button>
                </div>

                {(!quote.lines || quote.lines.length === 0) ? (
                    <div className="flex-1 flex items-center text-slate-500 justify-center">No lines added</div>
                ) : (
                    <div className="space-y-4">
                        {quote.lines.map((l: any) => (
                            <div key={l.id} className={`p-4 bg-[#252525] border ${l.isViolation ? 'border-red-500/50' : 'border-white/10'} rounded-lg flex items-center gap-4`}>
                                <div className="flex-1">
                                    <div className="text-white font-bold">{l.productName}</div>
                                    <div className="text-xs text-slate-400 mt-1">Unit: {l.unitPriceFormatted}</div>
                                </div>

                                <div className="flex flex-col gap-1 items-center">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Qty</label>
                                    <input type="number" value={l.quantity} onChange={(e) => updateLine(l.id, Number(e.target.value), l.discountPercent)} className="w-16 bg-[#121212] border border-white/20 p-1.5 rounded text-center text-white" />
                                </div>

                                <div className="flex flex-col gap-1 items-center">
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Disc %</label>
                                    <input type="number" value={l.discountPercent} onChange={(e) => updateLine(l.id, l.quantity, Number(e.target.value))} className={`w-16 bg-[#121212] border p-1.5 rounded text-center text-white ${l.isViolation ? 'border-red-500 text-red-500' : 'border-white/20'}`} />
                                </div>

                                <div className="w-24 text-right">
                                    <div className="text-emerald-400 font-bold">{l.lineTotalFormatted}</div>
                                </div>

                                <button onClick={() => removeLine(l.id)} className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-500 rounded hover:bg-red-500/40">✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT: Sticky Summary & Suggestions */}
            <div className="w-1/4 bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col h-fit sticky top-0 overflow-y-auto max-h-screen">

                {suggestions.filter(s => !dismissedSuggestions.has(s.product._id)).length > 0 && (
                    <div className="mb-6 mb-8 border-b border-white/10 pb-6">
                        <h3 className="text-[11px] uppercase tracking-wider font-bold text-amber-500 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Smart Suggestions
                        </h3>
                        <div className="space-y-3">
                            {suggestions.filter(s => !dismissedSuggestions.has(s.product._id)).map(s => (
                                <div key={s.product._id} className="p-3 bg-[#252525] border border-amber-500/20 rounded-lg text-sm transition-all hover:border-amber-500/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-white leading-tight">{s.product.name}</div>
                                            <div className="text-amber-500/80 text-[10px] uppercase font-bold mt-1">Why: {s.reason}</div>
                                        </div>
                                        {s.isPromoted && <span className="bg-blue-600 border border-blue-500 text-white text-[9px] uppercase px-1.5 py-0.5 rounded-sm font-bold">Promoted</span>}
                                    </div>
                                    <div className="flex items-center justify-between mt-3 text-xs">
                                        <div className={`font-bold ${s.marginPercentDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {s.marginPercentDelta > 0 ? '+' : ''}{s.marginPercentDelta.toFixed(2)}% margin
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setDismissedSuggestions(new Set([...dismissedSuggestions, s.product._id]))} className="text-slate-500 hover:text-white px-2 cursor-pointer transition-colors">✕</button>
                                            <button onClick={() => addLine(s.product)} className="bg-white/10 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold px-3 py-1 rounded cursor-pointer transition-colors">Add</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-bold text-white mb-6">Quote Summary</h3>
                <div className="space-y-3 text-sm mb-6 pb-6 border-b border-white/10">
                    <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="text-white">{quote.subtotalFormatted}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Discount</span><span className="text-blue-400">-{quote.discountFormatted}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Tax</span><span className="text-white">{quote.taxFormatted}</span></div>
                </div>

                <div className="flex justify-between items-end mb-8">
                    <span className="text-slate-400 font-medium">Grand Total</span>
                    <span className="text-2xl font-bold text-white">{quote.totalFormatted}</span>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between text-xs mb-2 font-bold">
                        <span className="text-slate-400 uppercase">Margin</span><span className="text-white">{quote.marginPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-full bg-[#252525] rounded-full overflow-hidden">
                        <div className={`h-full ${marginColor} transition-all duration-500`} style={{ width: `${Math.min(Math.max(quote.marginPct, 0), 100)}%` }}></div>
                    </div>
                </div>
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg mt-auto">Submit for Approval</button>
            </div>
        </div>
    );
}
