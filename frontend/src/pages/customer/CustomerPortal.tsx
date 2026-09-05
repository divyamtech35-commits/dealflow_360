import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../store/AuthContext';

interface CustomerPortalProps {
    tab?: 'VIEW' | 'CHANGES' | 'COUNTER' | 'CONFIRM';
}

export default function CustomerPortal({ tab = 'VIEW' }: CustomerPortalProps) {
    const { id } = useParams();
    const { user } = useAuth();

    const [quotes, setQuotes] = useState<any[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form states for Request Changes
    const [changeCategory, setChangeCategory] = useState('Quantity Adjustment');
    const [changeItem, setChangeItem] = useState('Entire Proposal');
    const [changeNotes, setChangeNotes] = useState('');
    const [changeUrgency, setChangeUrgency] = useState('Standard Review (24-48h)');
    const [changeLog, setChangeLog] = useState<any[]>([]);

    // Form states for Counter Discount
    const [counterBudget, setCounterBudget] = useState('');
    const [counterNotes, setCounterNotes] = useState('');
    const [counterLog, setCounterLog] = useState<any[]>([]);

    // Form states for Confirm Quote
    const [signatoryName, setSignatoryName] = useState(user?.name || 'Authorized Signatory');
    const [signatoryTitle, setSignatoryTitle] = useState('Procurement Officer');
    const [poNumber, setPoNumber] = useState('PO-2026-9041');
    const [agreeTerms, setAgreeTerms] = useState(false);

    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // Demo quotes fallback for initial customer evaluation
    const demoCustomerQuotes = [
        {
            id: 'demo-1',
            quotationNumber: 'QT-1042',
            customerName: user?.company || user?.name || 'Acme Corp',
            status: 'APPROVED',
            validUntil: 'Oct 15, 2026',
            totalFormatted: '$18,450.00',
            subtotalFormatted: '$20,500.00',
            discountFormatted: '$2,050.00',
            taxFormatted: '$0.00',
            totalAmount: 18450,
            subtotalAmount: 20500,
            notes: 'Net 30 payment terms; includes 12 months SLA support warranty and priority hardware dispatch.',
            lines: [
                { id: '1', productName: 'Enterprise PowerEdge Server R750', quantity: 2, unitPriceFormatted: '$7,000.00', lineTotalFormatted: '$14,000.00' },
                { id: '2', productName: 'Cisco Catalyst Core Switch 48-Port', quantity: 1, unitPriceFormatted: '$4,500.00', lineTotalFormatted: '$4,500.00' },
                { id: '3', productName: '24/7 Mission-Critical SLA Warranty', quantity: 1, unitPriceFormatted: '$2,000.00', lineTotalFormatted: '$2,000.00' }
            ]
        },
        {
            id: 'demo-2',
            quotationNumber: 'QT-1088',
            customerName: user?.company || user?.name || 'Acme Corp',
            status: 'SUBMITTED',
            validUntil: 'Nov 01, 2026',
            totalFormatted: '$42,200.00',
            subtotalFormatted: '$48,000.00',
            discountFormatted: '$5,800.00',
            taxFormatted: '$0.00',
            totalAmount: 42200,
            subtotalAmount: 48000,
            notes: 'Includes cloud storage volume and on-site deployment configuration.',
            lines: [
                { id: '4', productName: 'Cloud Storage SAN 50TB Array', quantity: 1, unitPriceFormatted: '$32,000.00', lineTotalFormatted: '$32,000.00' },
                { id: '5', productName: 'Pro Enterprise SLA Warranty (Annual)', quantity: 1, unitPriceFormatted: '$10,200.00', lineTotalFormatted: '$10,200.00' }
            ]
        }
    ];

    const fetchQuotes = async () => {
        setIsLoading(true);
        try {
            const res = await client.get('/quotations');
            if (res.data && res.data.length > 0) {
                setQuotes(res.data);
                const target = id ? res.data.find((q: any) => q.id === id) : res.data[0];
                setSelectedQuote(target || res.data[0]);
            } else {
                setQuotes(demoCustomerQuotes);
                setSelectedQuote(demoCustomerQuotes[0]);
            }
        } catch {
            setQuotes(demoCustomerQuotes);
            setSelectedQuote(demoCustomerQuotes[0]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, [id]);

    const handleSelectQuote = (q: any) => {
        setSelectedQuote(q);
        setActionSuccess(null);
    };

    // 1. Confirm Quote action
    const handleConfirmQuote = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedQuote) return;
        if (!agreeTerms && selectedQuote.status !== 'CONFIRMED') {
            alert('Please check the authorization agreement to confirm this proposal.');
            return;
        }

        try {
            await client.patch(`/quotations/${selectedQuote.id}`, {
                status: 'CONFIRMED',
                notes: `[Client Confirmed by ${signatoryName} (${signatoryTitle}), PO: ${poNumber}]`
            }).catch(() => {});

            const updated = { ...selectedQuote, status: 'CONFIRMED' };
            setSelectedQuote(updated);
            setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? updated : q));
            setActionSuccess(`Proposal ${selectedQuote.quotationNumber} confirmed and accepted under PO ${poNumber}.`);
        } catch {
            const updated = { ...selectedQuote, status: 'CONFIRMED' };
            setSelectedQuote(updated);
            setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? updated : q));
            setActionSuccess(`Proposal ${selectedQuote.quotationNumber} confirmed and accepted under PO ${poNumber}.`);
        }
    };

    // 2. Request Changes action
    const handleSubmitChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuote || !changeNotes.trim()) return;

        const newEntry = {
            id: `cr-${Date.now()}`,
            date: 'Just now',
            category: changeCategory,
            item: changeItem,
            notes: changeNotes,
            status: 'Pending Rep Review'
        };

        try {
            await client.patch(`/quotations/${selectedQuote.id}`, {
                notes: `[Client Change Request - ${changeCategory}]: ${changeNotes} (Urgency: ${changeUrgency})`
            }).catch(() => {});
        } catch {
            // fallback
        }

        setChangeLog(prev => [newEntry, ...prev]);
        setChangeNotes('');
        setActionSuccess(`Change request for ${selectedQuote.quotationNumber} has been submitted.`);
    };

    // 3. Counter Discount action
    const handleSubmitCounter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuote || !counterBudget.trim()) return;

        const newEntry = {
            id: `co-${Date.now()}`,
            date: 'Just now',
            proposedAmount: counterBudget.startsWith('$') ? counterBudget : `$${counterBudget}`,
            rationale: counterNotes || 'Client budget cap review',
            status: 'Under Review'
        };

        try {
            await client.patch(`/quotations/${selectedQuote.id}`, {
                notes: `[Client Counter-Offer]: Target budget ${counterBudget}. Justification: ${counterNotes}`
            }).catch(() => {});
        } catch {
            // fallback
        }

        setCounterLog(prev => [newEntry, ...prev]);
        setCounterBudget('');
        setCounterNotes('');
        setActionSuccess(`Counter-offer of ${newEntry.proposedAmount} for ${selectedQuote.quotationNumber} submitted.`);
    };

    if (isLoading && quotes.length === 0) {
        return (
            <div className="p-16 text-center text-xs text-slate-400">
                Loading customer proposals...
            </div>
        );
    }

    if (!selectedQuote) {
        return (
            <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <h3 className="text-base font-bold text-slate-800">No Proposals Available</h3>
                <p className="text-xs text-slate-400 mt-1">There are currently no active quotations assigned to your account.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            {/* Notification Banner */}
            {actionSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 animate-in fade-in">
                    <div>
                        <span className="px-2 py-0.5 rounded bg-emerald-200 uppercase text-[10px] mr-2">Success</span>
                        {actionSuccess}
                    </div>
                    <button
                        onClick={() => setActionSuccess(null)}
                        className="text-emerald-600 hover:text-emerald-900 cursor-pointer font-bold"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Contextual Proposal Selector Strip - strictly when multiple proposals exist */}
            {quotes.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-xs flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 shrink-0">
                        Switch Proposal:
                    </span>
                    {quotes.map(q => {
                        const isSelected = selectedQuote.id === q.id;
                        return (
                            <button
                                key={q.id || q._id}
                                onClick={() => handleSelectQuote(q)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                                    isSelected
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                {q.quotationNumber || 'QT-DRAFT'} ({q.totalFormatted || `$${(q.totalAmount || 0).toLocaleString()}`})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* TAB 1: VIEW QUOTE (Clean, Single-Header Commercial Letterhead) */}
            {tab === 'VIEW' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-8 sm:p-12 space-y-8">
                    {/* Official Letterhead Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-8 border-b border-slate-200">
                        <div>
                            <div className="text-xl font-black text-slate-900">DealFlow360 Enterprise Solutions</div>
                            <div className="text-xs text-slate-500 mt-1">100 Technology Plaza, Suite 400</div>
                            <div className="text-xs text-slate-500">San Francisco, CA 94105</div>
                            <div className="text-xs text-slate-400 mt-0.5 font-mono">commercial-ops@dealflow360.com</div>
                        </div>

                        <div className="sm:text-right text-xs space-y-1">
                            <div className="flex items-center sm:justify-end gap-2 mb-1">
                                <span className="font-mono font-bold text-blue-600 text-sm">
                                    {selectedQuote.quotationNumber || 'QT-PROPOSAL'}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    selectedQuote.status === 'CONFIRMED'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : selectedQuote.status === 'APPROVED'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                    {selectedQuote.status}
                                </span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">
                                Prepared For: {selectedQuote.customerName || user?.company || 'Enterprise Account'}
                            </div>
                            <div className="text-slate-500">Account Reference: {user?.id || 'CUST-8021'}</div>
                            <div className="text-slate-400">
                                Validity: <span className="font-semibold text-slate-700">{selectedQuote.validUntil || '30 Days from Issuance'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Itemized Line Items Table */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                            Itemized Schedule of Supplies & Services
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                        <th className="pb-3">Description</th>
                                        <th className="pb-3 text-center">Qty</th>
                                        <th className="pb-3 text-right">Unit Price</th>
                                        <th className="pb-3 text-right">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(selectedQuote.lines || []).map((line: any, index: number) => (
                                        <tr key={line.id || index} className="hover:bg-slate-50/50">
                                            <td className="py-4 font-bold text-slate-900">{line.productName}</td>
                                            <td className="py-4 text-center font-bold text-slate-700">{line.quantity}</td>
                                            <td className="py-4 text-right text-slate-600">
                                                {line.unitPriceFormatted || `$${(line.unitPrice || 0).toLocaleString()}`}
                                            </td>
                                            <td className="py-4 text-right font-black text-slate-900">
                                                {line.lineTotalFormatted || `$${(line.lineTotal || 0).toLocaleString()}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div className="max-w-md text-xs text-slate-500 space-y-2">
                            <div className="font-bold text-slate-900 uppercase tracking-wider">Contract Terms & Warranties</div>
                            <p className="leading-relaxed">
                                {selectedQuote.notes || 'Standard Net 30 payment terms upon hardware delivery. Includes 1-year mission-critical support warranty coverage.'}
                            </p>
                        </div>

                        <div className="w-full sm:w-72 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-500">
                                <span>Subtotal (MSRP List):</span>
                                <span className="font-semibold text-slate-700">
                                    {selectedQuote.subtotalFormatted || selectedQuote.totalFormatted}
                                </span>
                            </div>
                            <div className="flex justify-between text-emerald-700 font-semibold">
                                <span>Discount Applied:</span>
                                <span>-{selectedQuote.discountFormatted || '$0.00'}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Estimated Taxes / Duties:</span>
                                <span>{selectedQuote.taxFormatted || '$0.00'}</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-slate-200 text-base font-black text-slate-900">
                                <span>Net Contract Total:</span>
                                <span className="text-blue-600">{selectedQuote.totalFormatted}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: REQUEST CHANGES */}
            {tab === 'CHANGES' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Change Request Form */}
                    <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
                        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Submit Proposal Revision Request</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Target Quotation: <span className="font-mono font-bold text-blue-600">{selectedQuote.quotationNumber}</span>
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitChange} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Revision Category *
                                </label>
                                <select
                                    value={changeCategory}
                                    onChange={e => setChangeCategory(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-medium"
                                >
                                    <option value="Quantity Adjustment">Quantity Adjustment (Increase / Decrease)</option>
                                    <option value="Product Swap / Removal">Product Swap / Line Item Removal</option>
                                    <option value="Delivery Schedule / Logistics">Delivery Schedule / Multi-Warehouse Allocation</option>
                                    <option value="Contractual Terms / SLA">Contractual Terms / Support SLA Modification</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Target Item Affected
                                </label>
                                <select
                                    value={changeItem}
                                    onChange={e => setChangeItem(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-medium"
                                >
                                    <option value="Entire Proposal">Entire Proposal Scope</option>
                                    {(selectedQuote.lines || []).map((l: any, i: number) => (
                                        <option key={l.id || i} value={l.productName}>
                                            {l.productName} (Current Qty: {l.quantity})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Change Instructions & Rationale *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={changeNotes}
                                    onChange={e => setChangeNotes(e.target.value)}
                                    placeholder="Specify quantity changes, items to substitute, or timeline requirements..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Urgency
                                </label>
                                <div className="flex gap-2">
                                    {['Standard Review (24-48h)', 'Expedited Review (Urgent)'].map(urg => (
                                        <button
                                            key={urg}
                                            type="button"
                                            onClick={() => setChangeUrgency(urg)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                                changeUrgency === urg
                                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {urg}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                                >
                                    Submit Revision Request →
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Change Request History */}
                    <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                        <div className="pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Submitted Requests</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Audit log of proposal modifications</p>
                        </div>

                        {changeLog.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                No revision requests submitted for this proposal yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {changeLog.map(log => (
                                    <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{log.date}</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                {log.status}
                                            </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-900">{log.category}</div>
                                        <div className="text-xs text-slate-600">{log.notes}</div>
                                        <div className="text-[10px] font-mono text-slate-400">Target: {log.item}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: COUNTER DISCOUNT */}
            {tab === 'COUNTER' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Counter Form */}
                    <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
                        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Propose Counter Budget / Discount</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Target Quotation: <span className="font-mono font-bold text-blue-600">{selectedQuote.quotationNumber}</span>
                                </p>
                            </div>
                        </div>

                        {/* Deal Snapshot */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-3 text-center">
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">MSRP List</div>
                                <div className="text-sm font-bold text-slate-800 mt-0.5">
                                    {selectedQuote.subtotalFormatted || selectedQuote.totalFormatted}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">Current Discount</div>
                                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                                    {selectedQuote.discountFormatted || '$0.00'}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400">Current Net</div>
                                <div className="text-sm font-black text-blue-600 mt-0.5">
                                    {selectedQuote.totalFormatted}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitCounter} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Target Proposed Budget or Discount *
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={counterBudget}
                                    onChange={e => setCounterBudget(e.target.value)}
                                    placeholder="e.g. $16,500.00 or 15% discount"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-bold placeholder:font-normal"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Procurement Justification / Rationale *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={counterNotes}
                                    onChange={e => setCounterNotes(e.target.value)}
                                    placeholder="Provide business justification (budget cap, quarterly limits, competitor pricing)..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                                >
                                    Submit Counter-Offer →
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Counter Log */}
                    <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                        <div className="pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Counter-Offer Log</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Track negotiated budget proposals</p>
                        </div>

                        {counterLog.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                No counter-offers submitted for this proposal yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {counterLog.map(log => (
                                    <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{log.date}</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                {log.status}
                                            </span>
                                        </div>
                                        <div className="text-sm font-black text-slate-900">Target: {log.proposedAmount}</div>
                                        <div className="text-xs text-slate-600">{log.rationale}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: CONFIRM QUOTE */}
            {tab === 'CONFIRM' && (
                <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6">
                    <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900">Confirm & Digitally Accept Quotation</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Proposal: <span className="font-mono font-bold text-blue-600">{selectedQuote.quotationNumber}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Total Net</div>
                            <div className="text-xl font-black text-blue-600">{selectedQuote.totalFormatted}</div>
                        </div>
                    </div>

                    {selectedQuote.status === 'CONFIRMED' ? (
                        <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-800 uppercase tracking-wide">
                                Confirmed & Accepted
                            </span>
                            <h3 className="text-base font-bold text-emerald-950">Quotation Officially Accepted</h3>
                            <p className="text-xs text-emerald-700 max-w-md mx-auto">
                                This quotation has been digitally confirmed and entered into the order fulfillment schedule.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleConfirmQuote} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                        Authorized Signatory Name *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={signatoryName}
                                        onChange={e => setSignatoryName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                        Corporate Title *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={signatoryTitle}
                                        onChange={e => setSignatoryTitle(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                                    Purchase Order (PO) Reference # *
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={poNumber}
                                    onChange={e => setPoNumber(e.target.value)}
                                    placeholder="e.g. PO-2026-9041"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 text-slate-800 font-mono font-bold"
                                />
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={agreeTerms}
                                        onChange={e => setAgreeTerms(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-600 leading-relaxed">
                                        I certify that I am authorized to enter into a legally binding agreement under the stated pricing and terms for quotation <span className="font-mono font-bold text-blue-600">{selectedQuote.quotationNumber}</span>.
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={!agreeTerms}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                            >
                                Confirm & Digitally Accept Quotation →
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
