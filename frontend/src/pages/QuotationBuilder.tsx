import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import AuditTimeline from '../components/AuditTimeline';

export default function QuotationBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quote, setQuote] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const fetchQuote = async () => {
        try {
            const res = await client.get(`/quotations/${id}`);
            setQuote(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await client.get(`/config/products?search=${search}`);
            setProducts(res.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchQuote();
        fetchProducts();
    }, [id, search]);

    useEffect(() => {
        if (quote) {
            client.get(`/quotations/${id}/suggestions`)
                .then(res => setSuggestions(res.data || []))
                .catch(console.error);
        }
    }, [quote?.lines, id]);

    const addLine = async (p: any) => {
        const backup = { ...quote };
        setQuote({
            ...quote,
            lines: [
                ...(quote.lines || []),
                { productId: p._id, productName: p.name, quantity: 1, discountPercent: 0, lineTotalFormatted: '...' }
            ]
        });
        try {
            const res = await client.post(`/quotations/${id}/lines`, { productId: p._id, quantity: 1, discountPercent: 0 });
            setQuote(res.data);
        } catch (e) {
            setQuote(backup);
            alert('Failed to add product to quotation');
        }
    };

    const updateLine = async (lineId: string, quantity: number, discountPercent: number) => {
        if (quantity < 1 || discountPercent < 0 || discountPercent > 100) return;
        try {
            const res = await client.patch(`/quotations/${id}/lines/${lineId}`, { quantity, discountPercent });
            setQuote(res.data);
        } catch (e) {
            alert('Failed updating line item');
        }
    };

    const removeLine = async (lineId: string) => {
        try {
            const res = await client.delete(`/quotations/${id}/lines/${lineId}`);
            setQuote(res.data);
        } catch (e) {
            alert('Failed removing line item');
        }
    };

    const handleSubmitForApproval = async () => {
        if (!quote || quote.lines?.length === 0) {
            alert('Please add at least one line item before submitting.');
            return;
        }
        setIsSubmitting(true);
        setActionMessage(null);
        try {
            const res = await client.post(`/quotations/${id}/submit`);
            setQuote(res.data);
            if (res.data.status === 'APPROVED') {
                setActionMessage('Quotation approved automatically (within tier threshold)!');
            } else {
                setActionMessage('Quotation submitted for managerial approval.');
            }
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to submit quotation');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!quote) {
        return (
            <div className="p-12 text-center text-slate-500 font-medium">
                Loading Quotation Workspace...
            </div>
        );
    }

    // Risk badge styling
    let riskBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let riskBadgeText = 'Compliant — No Approval Needed';
    let riskIndicatorDot = 'bg-emerald-500';

    if (quote.requiredApprovalSteps?.includes('FINANCE') || quote.riskScore >= 15) {
        riskBadgeStyle = 'bg-red-50 text-red-700 border-red-200';
        riskBadgeText = 'Manager + Finance Sign-off Required';
        riskIndicatorDot = 'bg-red-500';
    } else if (quote.requiredApprovalSteps?.includes('SALES_MANAGER') || quote.riskScore > 0) {
        riskBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
        riskBadgeText = 'Manager Sign-off Required';
        riskIndicatorDot = 'bg-amber-500';
    }

    // Margin bar color
    const marginColor = quote.marginPct > 30 ? 'bg-emerald-500' : quote.marginPct > 15 ? 'bg-amber-500' : 'bg-red-500';
    const marginTextColor = quote.marginPct > 30 ? 'text-emerald-700' : quote.marginPct > 15 ? 'text-amber-700' : 'text-red-700';

    const getStatusBadgeStyle = (status: string) => {
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

    const filteredProducts = products.filter(p => {
        if (activeTab === 'All') return true;
        return p.categoryId?.name === activeTab;
    });

    const activeSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.product._id));

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Risk Engine Breakdown Modal */}
            {showRiskModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Blended Risk Engine Breakdown</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Automated deal governance and policy evaluation</p>
                            </div>
                            <button
                                onClick={() => setShowRiskModal(false)}
                                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold transition text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
                            {quote.lines?.map((l: any) => (
                                <div
                                    key={l.id}
                                    className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                                        l.isViolation
                                            ? 'bg-red-50/60 border-red-200 text-red-950'
                                            : 'bg-slate-50/60 border-slate-200/80 text-slate-800'
                                    }`}
                                >
                                    <div>
                                        <div className={`font-bold text-sm ${l.isViolation ? 'text-red-700' : 'text-slate-900'}`}>
                                            {l.productName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Given Discount: <span className="font-semibold text-slate-700">{l.discountPercent}%</span> vs Allowed Tier Policy: <span className="font-semibold text-slate-700">{l.allowedPercent}%</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                l.isViolation
                                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                            }`}
                                        >
                                            {l.overagePercent > 0 ? `+${l.overagePercent.toFixed(1)}% Overage` : 'Compliant'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Policy Weight Formula</div>
                                <div className="text-xs font-semibold text-slate-700 mt-0.5">60% Blended Line Average / 40% Worst Line Deviation</div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Violations</div>
                                    <div className="text-lg font-black text-slate-900">{quote.violationCount || 0}</div>
                                </div>
                                <div className="text-center pl-6 border-l border-slate-200">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Risk Score</div>
                                    <div className="text-2xl font-black text-amber-600">{quote.riskScore || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Quotation Header Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={() => navigate('/internal/quotations')}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                            ← Quotations Pipeline
                        </button>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            CPQ Builder
                        </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {quote.quotationNumber || 'QT-DRAFT'}
                        </h1>
                        <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeStyle(quote.status)}`}>
                            {quote.status}
                        </span>
                        {quote.customerTierSnapshot?.tier && (
                            <span className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold">
                                {quote.customerTierSnapshot.tier} Tier
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Client: <span className="font-bold text-slate-800">{quote.customerName || 'Standard Client'}</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Risk Badge Button */}
                    <button
                        onClick={() => setShowRiskModal(true)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer ${riskBadgeStyle}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${riskIndicatorDot}`} />
                        <span>{riskBadgeText} (Score: {quote.riskScore || 0})</span>
                    </button>

                    <button
                        onClick={() => navigate('/internal/fulfillment')}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                        Fulfillment
                    </button>

                    <button
                        onClick={() => navigate('/internal/billing')}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                        Billing
                    </button>

                    <button
                        onClick={() => navigate(`/portal/quotes/${quote.id}`)}
                        className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                        Customer View ↗
                    </button>
                </div>
            </div>

            {actionMessage && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                    <span>{actionMessage}</span>
                    <button onClick={() => setActionMessage(null)} className="text-blue-500 hover:text-blue-800 font-bold ml-4">✕</button>
                </div>
            )}

            {/* Main CPQ 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT: Product Catalog Panel (3 cols) */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 flex flex-col h-[650px]">
                    <div className="pb-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Product Catalog</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                {filteredProducts.length} Items
                            </span>
                        </div>

                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filter products by name..."
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400 mb-3"
                        />

                        {/* Category filter tabs */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {['All', 'Hardware', 'Services', 'Subscriptions'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                                        activeTab === tab
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 pr-1">
                        {filteredProducts.map(p => (
                            <div
                                key={p._id}
                                className="p-3 bg-slate-50/70 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 rounded-2xl flex items-center justify-between transition group"
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                                        {p.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        SKU: {p.sku || 'N/A'} • <span className="font-bold text-blue-600">${p.basePrice}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => addLine(p)}
                                    className="px-3 py-1.5 bg-white group-hover:bg-blue-600 group-hover:text-white border border-slate-200 group-hover:border-blue-600 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition cursor-pointer shrink-0"
                                >
                                    + Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER: Line Items Workspace (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between min-h-[650px]">
                    <div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Quotation Line Items</h3>
                                <p className="text-xs text-slate-500">Configure item volumes, pricing, and discount variances.</p>
                            </div>
                            <span className="text-xs font-bold text-slate-400">
                                {quote.lines?.length || 0} Lines
                            </span>
                        </div>

                        {(!quote.lines || quote.lines.length === 0) ? (
                            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <div className="text-sm font-bold text-slate-700">No products added to quote</div>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                    Browse the catalog on the left and click "+ Add" to populate deal line items.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {quote.lines.map((l: any) => (
                                    <div
                                        key={l.id}
                                        className={`p-4 rounded-2xl border transition ${
                                            l.isViolation
                                                ? 'bg-red-50/50 border-red-200'
                                                : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 leading-snug">
                                                    {l.productName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    Base Unit: {l.unitPriceFormatted}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeLine(l.id)}
                                                className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                                                title="Remove line"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                                            {/* Qty Input */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Qty:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={l.quantity}
                                                    onChange={e => updateLine(l.id, Number(e.target.value), l.discountPercent)}
                                                    className="w-14 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Disc % Input */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Disc%:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={l.discountPercent}
                                                    onChange={e => updateLine(l.id, l.quantity, Number(e.target.value))}
                                                    className={`w-14 px-2 py-1 bg-white border rounded-lg text-center text-xs font-bold outline-none ${
                                                        l.isViolation
                                                            ? 'border-red-400 text-red-600 focus:border-red-500'
                                                            : 'border-slate-200 text-slate-800 focus:border-blue-500'
                                                    }`}
                                                />
                                            </div>

                                            {/* Line Total */}
                                            <div className="text-right font-black text-slate-900 text-sm">
                                                {l.lineTotalFormatted}
                                            </div>
                                        </div>

                                        {l.isViolation && (
                                            <div className="mt-2 text-[10px] font-bold text-red-600 bg-red-100/70 px-2 py-0.5 rounded-md inline-block">
                                                ⚠ Exceeds allowed {l.allowedPercent}% (+{l.overagePercent?.toFixed(1)}% variance)
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Integrated Audit Trail */}
                    <div className="mt-6">
                        <AuditTimeline quoteId={quote.id} />
                    </div>
                </div>

                {/* RIGHT: Financial Summary & AI Upsell Engine (3 cols) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* AI Smart Suggestions Widget */}
                    {activeSuggestions.length > 0 && (
                        <div className="bg-white rounded-3xl border border-amber-200/80 shadow-xs p-5 bg-gradient-to-b from-amber-50/40 to-white">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                                    AI Deal Recommendations
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Upsell
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-3 leading-tight">
                                Recommended add-ons based on current deal composition.
                            </p>

                            <div className="space-y-3">
                                {activeSuggestions.map(s => (
                                    <div
                                        key={s.product._id}
                                        className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-amber-300 transition text-xs"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <span className="font-bold text-slate-900 leading-tight">
                                                {s.product.name}
                                            </span>
                                            {s.isPromoted && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                                                    Promoted
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-[10px] text-slate-500 mb-2">
                                            Why: <span className="font-semibold text-slate-700">{s.reason}</span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <span className={`text-[10px] font-bold ${s.marginPercentDelta > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                {s.marginPercentDelta > 0 ? '+' : ''}{s.marginPercentDelta?.toFixed(1)}% Margin
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setDismissedSuggestions(new Set([...dismissedSuggestions, s.product._id]))}
                                                    className="px-2 py-0.5 text-slate-400 hover:text-slate-700 font-bold text-xs"
                                                    title="Dismiss"
                                                >
                                                    ✕
                                                </button>
                                                <button
                                                    onClick={() => addLine(s.product)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                                                >
                                                    + Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Financial Breakdown Card */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                            Quote Financials
                        </h3>

                        <div className="space-y-2.5 text-xs pb-4 border-b border-slate-100">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal</span>
                                <span className="font-semibold text-slate-900">{quote.subtotalFormatted || '$0.00'}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Total Discount</span>
                                <span className="font-semibold text-blue-600">-{quote.discountFormatted || '$0.00'}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Tax Estimate</span>
                                <span className="font-semibold text-slate-900">{quote.taxFormatted || '$0.00'}</span>
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Grand Total</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                                {quote.totalFormatted || '$0.00'}
                            </div>
                        </div>

                        {/* Margin Health Indicator */}
                        <div className="pt-2">
                            <div className="flex justify-between text-xs mb-1.5 font-bold">
                                <span className="text-slate-500 uppercase text-[10px] tracking-wider">Margin Compliance</span>
                                <span className={`text-xs ${marginTextColor}`}>{quote.marginPct?.toFixed(1)}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${marginColor} transition-all duration-500`}
                                    style={{ width: `${Math.min(Math.max(quote.marginPct || 0, 0), 100)}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                {quote.marginPct > 30 ? 'Healthy deal margin' : quote.marginPct > 15 ? 'Requires manager review' : 'High risk deal variance'}
                            </div>
                        </div>

                        {/* Submit Action */}
                        <button
                            onClick={handleSubmitForApproval}
                            disabled={isSubmitting || quote.status === 'APPROVED'}
                            className="group-btn relative w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center cursor-pointer overflow-hidden"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />
                            <span>
                                {isSubmitting
                                    ? 'Evaluating Policy...'
                                    : quote.status === 'APPROVED'
                                    ? 'Quotation Approved'
                                    : quote.status === 'PENDING_APPROVAL' || quote.status === 'SUBMITTED'
                                    ? 'Re-evaluate & Submit'
                                    : 'Submit for Approval'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

