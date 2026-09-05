import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import AuditTimeline from '../components/AuditTimeline';

export default function QuotationBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quote, setQuote] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [replyText, setReplyText] = useState('');

    const fetchQuote = async () => {
        try {
            const res = await client.get(`/quotations/${id}`);
            setQuote(res.data);
            setNotes(res.data.notes || '');
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

    const fetchCustomers = async () => {
        try {
            const res = await client.get('/config/customers');
            setCustomers(res.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchQuote();
        fetchProducts();
        fetchCustomers();
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
                { productId: p._id, productName: p.name, quantity: 1, discountPercent: 0, lineTotal: p.basePrice }
            ]
        });
        try {
            const res = await client.post(`/quotations/${id}/lines`, { productId: p._id, variantId: null, quantity: 1, discountPercent: 0 });
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

    const updateCustomer = async (customerId: string) => {
        try {
            const res = await client.patch(`/quotations/${id}`, { customerId });
            setQuote(res.data);
        } catch (e) {
            alert('Failed to update customer');
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

    const postReply = async () => {
        if (!replyText) return;
        try {
            const res = await client.post(`/quotations/${id}/reply`, { message: replyText });
            setQuote(res.data);
            setReplyText('');
        } catch (e) {
            alert('Failed to post reply');
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
            // First save notes
            await client.patch(`/quotations/${id}`, { notes });
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

    const filteredProducts = products.filter(p => {
        if (activeTab === 'All') return true;
        return p.categoryId?.name === activeTab;
    });

    const activeSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.product._id));

    const tierName = quote.customerTierSnapshot?.tier || 'Unknown';
    // Max discount is determined by tier or category. We don't have the exact tier cap returned yet natively in the quote object easily except via rules. We can parse it from lines if needed, or assume a general cap.
    // For UI purposes, we'll derive max cap based on the lines' allowedPercent if available.
    let generalCap = 15;
    if (tierName === 'Bronze') generalCap = 8;
    if (tierName === 'Silver') generalCap = 10;
    if (tierName === 'Gold') generalCap = 15;

    // Formatting Helpers
    const formatMoney = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
            {/* 2. PAGE HEADER */}
            <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="bg-blue-600 text-white w-8 h-8 rounded flex items-center justify-center text-sm">D3</span>
                        Sales Workspace
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Configure line items, apply governed discounts, and evaluate real-time pricing and risk.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase">Customer:</span>
                    <select 
                        value={quote.customerId}
                        onChange={(e) => updateCustomer(e.target.value)}
                        disabled={quote.status !== 'DRAFT'}
                        className="bg-white border border-slate-300 rounded-lg text-sm font-semibold px-3 py-1.5 shadow-xs outline-none focus:border-blue-500 max-w-[250px] truncate"
                    >
                        {!customers.some(c => c._id === quote.customerId) && (
                            <option value={quote.customerId}>{quote.customerName} ({tierName} Tier)</option>
                        )}
                        {customers.map(c => (
                            <option key={c._id} value={c._id}>
                                {c.name} ({c.tier?.name} Tier)
                            </option>
                        ))}
                    </select>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold whitespace-nowrap">
                        Max {generalCap}% Disc
                    </span>
                </div>
            </header>

            {actionMessage && (
                <div className="max-w-7xl mx-auto mt-6 px-6">
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold flex items-center justify-between">
                        <span>{actionMessage}</span>
                        <button onClick={() => setActionMessage(null)} className="text-blue-500 hover:text-blue-800">✕</button>
                    </div>
                </div>
            )}

            {/* 3. MAIN PAGE LAYOUT */}
            <main className="max-w-screen-2xl mx-auto mt-8 px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* 4. QUOTATION LINE ITEMS CARD */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Quotation Line Items</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{quote.lines?.length || 0} items currently configured</p>
                            </div>
                            <div className="text-xs font-semibold text-slate-600">
                                Authorized Tier Cap: <span className="font-bold text-slate-900">{generalCap}%</span>
                            </div>
                        </div>

                        {quote.lines?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                                            <th className="px-6 py-3">Product</th>
                                            <th className="px-4 py-3 text-center">Qty</th>
                                            <th className="px-4 py-3 text-right">Unit Price</th>
                                            <th className="px-4 py-3 text-center">Discount %</th>
                                            <th className="px-4 py-3 text-center">Margin</th>
                                            <th className="px-6 py-3 text-right">Line Total</th>
                                            <th className="px-4 py-3 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {quote.lines.map((l: any) => {
                                            const gross = l.unitPrice * l.quantity;
                                            const lineCost = l.costPrice * l.quantity;
                                            const marginPct = gross > 0 ? (((l.lineTotal - lineCost) / l.lineTotal) * 100) : 0;
                                            
                                            // 5. DISCOUNT INPUT BEHAVIOR
                                            const isWarn = l.isViolation;
                                            
                                            return (
                                                <tr key={l.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-sm text-slate-900">{l.productName}</div>
                                                        <div className="text-[10px] text-slate-400 mt-1">Cost: {formatMoney(l.costPrice)}</div>
                                                        {isWarn && (
                                                            <div className="text-[10px] font-bold text-red-600 mt-1.5 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                                                                Discount exceeds limit by {l.overagePercent?.toFixed(1)}%
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <input
                                                            type="number" min="1" value={l.quantity}
                                                            disabled={!['DRAFT', 'UNDER_NEGOTIATION'].includes(quote.status)}
                                                            onChange={e => updateLine(l.id, Number(e.target.value), l.discountPercent)}
                                                            className="w-16 px-2 py-1.5 border border-slate-200 rounded text-center text-sm font-semibold outline-none focus:border-blue-500 transition disabled:bg-slate-50 disabled:text-slate-400"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-semibold text-sm text-slate-700">
                                                        {formatMoney(l.unitPrice)}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number" min="0" max="100" value={l.discountPercent}
                                                                disabled={!['DRAFT', 'UNDER_NEGOTIATION'].includes(quote.status)}
                                                                onChange={e => updateLine(l.id, l.quantity, Number(e.target.value))}
                                                                className={`w-16 px-2 py-1.5 border rounded text-center text-sm font-bold outline-none transition disabled:bg-slate-50 disabled:text-slate-400 ${isWarn ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500' : 'border-slate-200 focus:border-blue-500'}`}
                                                            />
                                                            <span className="text-xs font-bold text-slate-400">%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${marginPct < 30 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                                                            {marginPct.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-900 text-base">
                                                        {formatMoney(l.lineTotal || 0)}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button disabled={!['DRAFT', 'UNDER_NEGOTIATION'].includes(quote.status)} onClick={() => removeLine(l.id)} className="text-slate-400 hover:text-red-500 transition cursor-pointer p-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-sm font-medium text-slate-400">
                                No products added to quote.
                            </div>
                        )}
                        
                        {/* 6. COMMERCIAL NOTES */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-700 mb-2">Commercial Notes / Terms:</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                disabled={!['DRAFT', 'UNDER_NEGOTIATION'].includes(quote.status)}
                                placeholder="Add customer-specific terms, delivery conditions, or deal justification..."
                                className="w-full h-20 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-y disabled:bg-slate-100 disabled:text-slate-500"
                            />
                        </div>
                        
                        {/* CUSTOMER NEGOTIATIONS THREAD */}
                        {quote.negotiations && quote.negotiations.length > 0 && (
                            <div className="p-6 bg-white border-t border-slate-200">
                                <h3 className="text-sm font-bold text-slate-900 mb-4">Customer Negotiation Thread</h3>
                                <div className="space-y-4">
                                    {quote.negotiations.map((n: any) => {
                                        const isCustomer = n.actorType === 'CUSTOMER';
                                        return (
                                            <div key={n._id} className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}>
                                                <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${isCustomer ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-bl-none' : 'bg-slate-800 text-white rounded-br-none'}`}>
                                                    {n.type === 'COUNTER_DISCOUNT' && (
                                                        <div className={`text-xs font-bold mb-1 ${isCustomer ? 'text-indigo-600' : 'text-slate-300'}`}>
                                                            Customer Proposed {n.requestedDiscountPercent}% discount
                                                        </div>
                                                    )}
                                                    {n.message}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    {isCustomer ? 'Customer' : 'You'} &bull; {new Date(n.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    
                                    {['DRAFT', 'UNDER_NEGOTIATION'].includes(quote.status) && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <label className="block text-xs font-bold text-slate-700 mb-2">Reply to Customer:</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    placeholder="Type your reply to the customer..."
                                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                                />
                                                <button 
                                                    onClick={postReply}
                                                    disabled={!replyText}
                                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 7. CATALOG & PRODUCTS */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Catalog & Products</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Search and add products to the quotation</p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <svg className="absolute left-3 top-2.5 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search products or SKU..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition"
                                />
                            </div>
                        </div>

                        {/* 8. PRODUCT CATEGORIES */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
                            {['All', 'Hardware', 'Services', 'Subscriptions'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                                        activeTab === tab
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProducts.map(p => (
                                <div key={p._id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between group bg-white">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-sm text-slate-900 leading-tight">
                                                {p.name}
                                                {p.isSubscription && <span className="ml-2 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] uppercase tracking-wider">Sub</span>}
                                            </h3>
                                            <button
                                                onClick={() => addLine(p)}
                                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer shrink-0"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                            High-performance scalable architecture mapped to deal specific requirements.
                                        </p>
                                    </div>
                                    <div className="mt-3 font-black text-slate-900 text-sm">
                                        {formatMoney(p.basePrice)} {p.isSubscription && <span className="text-xs text-slate-500 font-medium">/mo</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* 9. PRICING & MARGIN ENGINE */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="mb-5 pb-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">Pricing & Margin Engine</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Backend calculated live totals</p>
                        </div>

                        <div className="space-y-3 text-sm mb-5 pb-5 border-b border-slate-100">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal:</span>
                                <span className="font-semibold text-slate-900">{formatMoney(quote.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span className="text-emerald-600">Discount Applied:</span>
                                <span className="text-emerald-600 font-bold">-{formatMoney(quote.discountAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Estimated Tax (8.5%):</span>
                                <span className="font-semibold text-slate-900">{formatMoney(quote.taxAmount || 0)}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <span className="text-lg font-black text-slate-900">Total Deal:</span>
                            <span className="text-xl font-black text-blue-700">{formatMoney(quote.totalAmount || 0)}</span>
                        </div>

                        {/* 10. MARGIN CALCULATION */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-600">Gross Margin:</span>
                            <span className={`text-base font-black ${quote.marginPct < 35 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {quote.marginPct?.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* 11. RISK ASSESSMENT CARD */}
                    {quote.lines?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Risk Assessment:</h2>
                                
                                {quote.riskScore < 20 ? (
                                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                        LOW Risk ({quote.riskScore})
                                    </span>
                                ) : quote.riskScore < 50 ? (
                                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                                        MEDIUM Risk ({quote.riskScore})
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                                        HIGH Risk ({quote.riskScore})
                                    </span>
                                )}
                            </div>

                            {/* 12. BLENDED DISCOUNT RISK EXPLANATIONS */}
                            {quote.riskScore > 0 ? (
                                <div className="space-y-2 mt-4 text-xs">
                                    {quote.lines?.filter((l:any)=>l.isViolation).map((l:any) => (
                                        <div key={l.id} className="flex gap-2 text-slate-600">
                                            <span className="text-amber-500">⚠</span>
                                            <span>
                                                {l.productName} discount exceeds limit by {l.overagePercent?.toFixed(1)}% 
                                                <span className="text-slate-400 ml-1">(+{(l.overagePercent * 4).toFixed(0)} risk pts)</span>
                                            </span>
                                        </div>
                                    ))}
                                    {quote.marginPct < 35 && quote.marginPct > 0 && (
                                        <div className="flex gap-2 text-slate-600">
                                            <span className="text-amber-500">⚠</span>
                                            <span>
                                                Gross margin is {quote.marginPct?.toFixed(1)}% (below 35% target) 
                                                <span className="text-slate-400 ml-1">(+21 risk pts)</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 mt-2">Deal is currently compliant with all governance policies.</p>
                            )}
                        </div>
                    )}

                    {/* 13. APPROVAL STATUS */}
                    <div className={`rounded-2xl border p-5 shadow-sm ${quote.requiredApprovalSteps?.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex gap-3">
                            {quote.requiredApprovalSteps?.length > 0 ? (
                                <>
                                    <div className="mt-0.5 text-amber-600">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-900 mb-1">
                                            Approval Required ({quote.requiredApprovalSteps.join(' + ')})
                                        </h3>
                                        <p className="text-xs text-amber-800/80 leading-relaxed">
                                            This quotation exceeds tier discount limit or risk threshold. It will be queued for manager review upon submission.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mt-0.5 text-emerald-600">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-emerald-900 mb-1">
                                            Approval Not Required
                                        </h3>
                                        <p className="text-xs text-emerald-800/80 leading-relaxed">
                                            Deal is within authorized parameters and can be sent to customer immediately upon submission.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 15. SUBMIT QUOTATION */}
                    <div className="space-y-3 pt-2">
                        <button
                            onClick={handleSubmitForApproval}
                            disabled={isSubmitting || !['DRAFT', 'UNDER_NEGOTIATION'].includes(quote.status)}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isSubmitting ? 'Processing...' : (!['DRAFT', 'UNDER_NEGOTIATION'].includes(quote.status)) ? `Quotation ${quote.status}` : 'Submit Quotation →'}
                        </button>
                        <button className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl shadow-xs transition cursor-pointer">
                            Save as Draft
                        </button>
                    </div>

                    {/* 17. RECOMMENDED ADD-ONS */}
                    {activeSuggestions.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-sm font-bold text-slate-900 mb-1">Recommended Add-ons</h3>
                            <p className="text-xs text-slate-500 mb-4">Complementary products for this basket</p>
                            
                            <div className="space-y-3">
                                {activeSuggestions.map(s => (
                                    <div key={s.product._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 group hover:border-blue-300 transition">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <div className="font-bold text-sm text-slate-900">{s.product.name}</div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">{s.reason}</div>
                                            </div>
                                            {s.isPromoted && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold uppercase rounded border border-blue-100 shrink-0">Promo</span>}
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="text-xs font-semibold text-emerald-600">Margin Impact: +{formatMoney((s.product.basePrice - s.product.costPrice) || 0)}</div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setDismissedSuggestions(new Set([...dismissedSuggestions, s.product._id]))} className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 cursor-pointer">Dismiss</button>
                                                <button onClick={() => addLine(s.product)} className="text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer">+ Add to Quote</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
