import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { 
    ArrowLeft, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    Send, 
    FileText, 
    Percent, 
    MessageSquare, 
    Check, 
    ShieldCheck, 
    Truck, 
    Sparkles, 
    Info,
    ChevronRight,
    Edit3,
    ShieldAlert,
    Package
} from 'lucide-react';

export default function PortalView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Core state
    const [quote, setQuote] = useState<any>(null);
    const [threads, setThreads] = useState<any[]>([]);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Confirmation outcome state
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [confirmStatus, setConfirmStatus] = useState<any>(null);

    // Negotiation tool state
    const [activeTab, setActiveTab] = useState<'line_change' | 'counter_discount' | 'comment'>('line_change');
    const [selectedLineId, setSelectedLineId] = useState<string>('');
    const [requestedQty, setRequestedQty] = useState<number | ''>('');
    const [requestedDiscount, setRequestedDiscount] = useState<number | ''>('');
    const [messageText, setMessageText] = useState('');
    const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

    const fetchPortalData = async () => {
        try {
            const res = await client.get(`/portal/quotations/${id}`);
            const q = res.data.quotation;
            setQuote(q);
            setThreads(res.data.negotiations || []);
            setOrder(res.data.order || null);

            // If a line isn't chosen yet and quote has lines, set default
            if (!selectedLineId && q.lines && q.lines.length > 0) {
                setSelectedLineId(q.lines[0].id);
                setRequestedQty(q.lines[0].quantity);
            }
        } catch (e: any) {
            setError(e.response?.data?.error || e.message || 'Failed to load quotation');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortalData();
    }, [id]);

    // Handle line selection change in dropdown or clicking on table row
    const handleSelectLine = (lineId: string) => {
        setSelectedLineId(lineId);
        const line = quote?.lines?.find((l: any) => l.id === lineId);
        if (line) {
            setRequestedQty(line.quantity);
        }
    };

    // Calculate simulated counter discount impact
    const calculateCounterSimulation = () => {
        if (!quote) return { discountVal: 0, newTotal: 0 };
        const subtotal = Number(quote.subtotal || 0);
        const discountPct = Number(requestedDiscount) || 0;
        const discountVal = (subtotal * discountPct) / 100;
        const tax = Number(quote.taxAmount || 0);
        const newTotal = Math.max(0, subtotal - discountVal + tax);
        return { discountVal, newTotal };
    };

    // Submit Request: Line change, counter discount proposal, or comment
    const handleSubmitRequest = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!messageText.trim() && activeTab === 'comment') {
            alert('Please enter a comment or message.');
            return;
        }

        setSubmitting(true);
        setSubmitFeedback(null);

        try {
            let payload: any = {
                message: messageText.trim()
            };

            if (activeTab === 'line_change') {
                payload.type = 'CHANGE_REQUEST';
                payload.lineId = selectedLineId;
                if (requestedQty !== '') {
                    payload.requestedQuantity = Number(requestedQty);
                }
                if (!payload.message) {
                    const line = quote.lines?.find((l: any) => l.id === selectedLineId);
                    payload.message = `Change requested for ${line ? line.productName : 'line item'}: Quantity ${requestedQty || line?.quantity}`;
                }
            } else if (activeTab === 'counter_discount') {
                payload.type = 'COUNTER_DISCOUNT';
                payload.requestedDiscountPercent = Number(requestedDiscount) || 0;
                if (!payload.message) {
                    payload.message = `Proposed counter discount of ${requestedDiscount}% on quotation terms.`;
                }
            } else {
                payload.type = 'COMMENT';
                if (selectedLineId) {
                    payload.lineId = selectedLineId;
                }
            }

            const res = await client.post(`/portal/quotations/${id}/request`, payload);

            // Reset inputs & feedback
            setMessageText('');
            if (res.data?.escalated) {
                setSubmitFeedback(res.data.message || `Customer proposed ${requestedDiscount}% discount. Proposed counter discount of ${requestedDiscount}% exceeds max authorized discount (${res.data.maxDiscount || 15}%). Request has been sent directly to the Sales Manager for review.`);
            } else {
                setSubmitFeedback('Your request has been submitted to your sales representative.');
            }
            setTimeout(() => setSubmitFeedback(null), 9000);

            // Refresh quotation and threads
            await fetchPortalData();
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    // Confirm Quotation:
    // If final terms exceed approval thresholds, re-enters approval flow from B4 (PENDING_APPROVAL).
    // Otherwise, order moves directly to fulfillment (CONFIRMED).
    const handleConfirmQuotation = async () => {
        setConfirmModalOpen(false);
        setSubmitting(true);
        try {
            const res = await client.post(`/portal/quotations/${id}/confirm`);
            setConfirmStatus(res.data);
            await fetchPortalData();
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || 'Failed to confirm quotation');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-slate-600 font-medium">Loading commercial quotation environment...</div>
            </div>
        );
    }

    if (error || !quote) {
        return (
            <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl border border-red-200 shadow-sm text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
                <p className="text-slate-600 text-sm mb-6">{error || 'Quotation could not be located.'}</p>
                <button
                    onClick={() => navigate('/portal/dashboard')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Return to Dashboard
                </button>
            </div>
        );
    }

    // Status helpers
    // Database statuses: APPROVED/SENT -> "Sent", UNDER_NEGOTIATION -> "Under Negotiation", CONFIRMED -> "Confirmed", PENDING_APPROVAL -> "Under Review (Approval Flow B4)"
    const isSent = quote.status === 'APPROVED' || quote.status === 'SENT';
    const isUnderNegotiation = quote.status === 'UNDER_NEGOTIATION';
    const isConfirmed = quote.status === 'CONFIRMED';
    const isPendingApproval = quote.status === 'PENDING_APPROVAL';

    const getStatusBadge = () => {
        if (isConfirmed) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Confirmed
                </span>
            );
        }
        if (isUnderNegotiation) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                    Under Negotiation
                </span>
            );
        }
        if (isPendingApproval) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
                    <ShieldAlert className="w-4 h-4 text-purple-600 animate-pulse" />
                    Under Review (Sales Manager Approval Required)
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                <Send className="w-4 h-4 text-blue-600" />
                Sent
            </span>
        );
    };

    const selectedLine = quote.lines?.find((l: any) => l.id === selectedLineId);
    const { discountVal, newTotal } = calculateCounterSimulation();
    const latestCounter = [...threads].reverse().find(t => t.type === 'COUNTER_DISCOUNT');

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-16">
            {/* Top Navigation & Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <button
                    onClick={() => navigate('/portal/dashboard')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Customer Dashboard
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Status:</span>
                    {getStatusBadge()}
                </div>
            </div>

            {/* Counter Offer Decision Status Notice */}
            {latestCounter && (
                <>
                    {latestCounter.status === 'ACCEPTED' && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 shadow-xs flex items-start gap-4 animate-in fade-in duration-200">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1 text-xs space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-emerald-950">
                                        Counter Offer Accepted! ({latestCounter.requestedDiscountPercent}% Discount Approved)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-emerald-200/90 text-emerald-900">
                                        Approved by Management
                                    </span>
                                </div>
                                <p className="text-emerald-900 leading-relaxed">
                                    Your counter discount proposal of <strong>{latestCounter.requestedDiscountPercent}%</strong> has been approved by sales management. The quotation has been revised with these approved terms. Please review the updated figures below and click <strong>Confirm Quotation</strong> to proceed.
                                </p>
                            </div>
                        </div>
                    )}

                    {latestCounter.status === 'REJECTED' && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border border-red-200 text-red-950 shadow-xs flex items-start gap-4 animate-in fade-in duration-200">
                            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex-1 text-xs space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-red-950">
                                        Counter Offer Declined ({latestCounter.requestedDiscountPercent}% Discount)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-red-200/90 text-red-900">
                                        Declined
                                    </span>
                                </div>
                                <p className="text-red-900 leading-relaxed">
                                    Your proposed counter discount of {latestCounter.requestedDiscountPercent}% was not approved by sales management. Please check the discussion thread below for representative feedback or submit a revised proposal.
                                </p>
                            </div>
                        </div>
                    )}

                    {latestCounter.status === 'OPEN' && !isConfirmed && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 shadow-xs flex items-start gap-4 animate-in fade-in duration-200">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                                <Clock className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="flex-1 text-xs space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-amber-950">
                                        Counter Offer Pending Review ({latestCounter.requestedDiscountPercent}% Discount)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-amber-200/90 text-amber-900">
                                        In Review
                                    </span>
                                </div>
                                <p className="text-amber-900 leading-relaxed">
                                    Your proposed counter discount of {latestCounter.requestedDiscountPercent}% has been submitted and is currently pending review by the Sales Manager. You will be notified directly here once an approval decision is reached.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Post-Confirmation Banners */}
            {confirmStatus && (
                <div className={`p-6 rounded-2xl border shadow-sm transition-all ${
                    confirmStatus.status === 'PENDING_APPROVAL' 
                        ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-900' 
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900'
                }`}>
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            confirmStatus.status === 'PENDING_APPROVAL' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                            {confirmStatus.status === 'PENDING_APPROVAL' ? <ShieldCheck className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold">
                                {confirmStatus.status === 'PENDING_APPROVAL'
                                    ? 'Quotation Confirmed — Re-entered Approval Flow (B4)'
                                    : 'Quotation Confirmed & Order Created!'}
                            </h3>
                            <p className="text-sm mt-1 text-slate-700">
                                {confirmStatus.message}
                            </p>
                            {confirmStatus.status === 'PENDING_APPROVAL' ? (
                                <div className="mt-3 text-xs bg-white/70 border border-purple-200 rounded-lg p-3 inline-block">
                                    <span className="font-semibold text-purple-900">Next Step:</span> Because the final negotiated terms exceed discount and margin thresholds, the quotation has been automatically rerouted to sales management for sign-off. You will receive an update once signed.
                                </div>
                            ) : (
                                <div className="mt-3 flex items-center gap-3">
                                    <span className="text-xs font-semibold bg-white/80 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg">
                                        Sales Order: {confirmStatus.orderNumber || 'SO-Confirmed'}
                                    </span>
                                    <button 
                                        onClick={() => navigate('/portal/dashboard')}
                                        className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                                    >
                                        Track in Fulfillment Dashboard →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header Quotation Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded">
                                Official Quotation
                            </span>
                            <span className="text-xs text-slate-400">ID: {quote.quotationNumber}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-white">
                            Quotation {quote.quotationNumber}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs text-slate-300">
                            <span>Issued: <strong>{new Date(quote.createdAt).toLocaleDateString()}</strong></span>
                            {quote.validUntil && (
                                <span>Valid Until: <strong>{new Date(quote.validUntil).toLocaleDateString()}</strong></span>
                            )}
                            <span>Currency: <strong>{quote.currency || 'USD'}</strong></span>
                        </div>
                    </div>

                    {/* Status Stepper */}
                    <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-4 md:w-80">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Negotiation Stage
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold">
                            <div className={`flex flex-col items-center ${isSent || isUnderNegotiation || isConfirmed || isPendingApproval ? 'text-indigo-400' : 'text-slate-500'}`}>
                                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] mb-1">1</div>
                                <span>Sent</span>
                            </div>
                            <div className={`h-0.5 flex-1 mx-1 ${isUnderNegotiation || isConfirmed || isPendingApproval ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                            <div className={`flex flex-col items-center ${isUnderNegotiation ? 'text-amber-400' : (isConfirmed || isPendingApproval ? 'text-indigo-400' : 'text-slate-500')}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] mb-1 ${isUnderNegotiation ? 'bg-amber-500 text-white ring-4 ring-amber-500/20' : (isConfirmed || isPendingApproval ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400')}`}>2</div>
                                <span>Negotiate</span>
                            </div>
                            <div className={`h-0.5 flex-1 mx-1 ${isConfirmed || isPendingApproval ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                            <div className={`flex flex-col items-center ${isConfirmed ? 'text-emerald-400' : (isPendingApproval ? 'text-purple-400' : 'text-slate-500')}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] mb-1 ${isConfirmed ? 'bg-emerald-500 text-white' : (isPendingApproval ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400')}`}>3</div>
                                <span>{isPendingApproval ? 'Review' : 'Confirm'}</span>
                            </div>
                            <div className={`h-0.5 flex-1 mx-1 ${isConfirmed ? (order?.status === 'FULFILLED' ? 'bg-emerald-500' : order?.hasBackorder ? 'bg-amber-500' : 'bg-blue-500') : 'bg-slate-700'}`}></div>
                            <div className={`flex flex-col items-center ${
                                isConfirmed
                                    ? (order?.status === 'FULFILLED' 
                                        ? 'text-emerald-400 font-bold' 
                                        : order?.hasBackorder 
                                            ? 'text-amber-400 font-semibold' 
                                            : 'text-blue-400 font-semibold')
                                    : 'text-slate-500'
                            }`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] mb-1 ${
                                    isConfirmed
                                        ? (order?.status === 'FULFILLED'
                                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                                            : order?.hasBackorder
                                                ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                                                : 'bg-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse')
                                        : 'bg-slate-700 text-slate-400'
                                }`}>
                                    4
                                </div>
                                <span>
                                    {isConfirmed 
                                        ? (order?.status === 'FULFILLED' 
                                            ? 'Fulfilled' 
                                            : order?.hasBackorder 
                                                ? 'Backorder' 
                                                : 'In Queue') 
                                        : 'Fulfill'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fulfillment Status Banner when Quotation is Confirmed */}
            {isConfirmed && (
                <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
                    order?.status === 'FULFILLED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : order?.hasBackorder
                            ? 'bg-amber-50 border-amber-200 text-amber-950'
                            : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}>
                    <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            order?.status === 'FULFILLED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order?.hasBackorder
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                        }`}>
                            {order?.status === 'FULFILLED' ? (
                                <CheckCircle2 className="w-5 h-5" />
                            ) : order?.hasBackorder ? (
                                <Package className="w-5 h-5" />
                            ) : (
                                <Truck className="w-5 h-5" />
                            )}
                        </div>
                        <div className="flex-1 text-xs space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">
                                    {order?.status === 'FULFILLED'
                                        ? `Order #${order?.orderNumber || 'SO-Confirmed'} — Fully Fulfilled & Dispatched`
                                        : order?.hasBackorder
                                            ? `Order #${order?.orderNumber || 'SO-Confirmed'} — In Fulfillment Pipeline (Backorder Active)`
                                            : `Order #${order?.orderNumber || 'SO-Confirmed'} — In Warehouse Fulfillment Queue`}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                    order?.status === 'FULFILLED'
                                        ? 'bg-emerald-200 text-emerald-800'
                                        : order?.hasBackorder
                                            ? 'bg-amber-200 text-amber-800'
                                            : 'bg-blue-200 text-blue-800'
                                }`}>
                                    {order?.status === 'FULFILLED'
                                        ? 'Fulfilled'
                                        : order?.hasBackorder
                                            ? 'Backordered Stock (Not Completed)'
                                            : 'Pending Fulfillment'}
                                </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                                {order?.status === 'FULFILLED'
                                    ? 'All items have been allocated, packed, and dispatched from the warehouse.'
                                    : order?.hasBackorder
                                        ? 'Commercial terms are confirmed. However, requested line quantity exceeds current warehouse stock on hand. The unfulfilled portion is placed on Backorder and will be fulfilled once replacement inventory arrives.'
                                        : 'Commercial terms are confirmed. The sales order is queued in the warehouse system for stock allocation and dispatch.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid: Quotation Lines (Left) & Negotiation Tool (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column (7 cols): Itemized Quotation Table */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                    Commercial Line Items
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Review item quantities and discounts. Click "Request Change" to adjust a line.
                                </p>
                            </div>
                            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold">
                                {quote.lines?.length || 0} Items
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/70 border-b border-slate-100">
                                        <th className="py-3 px-6 font-bold">Product & Description</th>
                                        <th className="py-3 px-4 text-center font-bold">Qty</th>
                                        <th className="py-3 px-4 text-right font-bold">Unit Price</th>
                                        <th className="py-3 px-4 text-right font-bold">Total</th>
                                        <th className="py-3 px-6 text-center font-bold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {quote.lines?.map((line: any) => {
                                        const isSelected = selectedLineId === line.id;
                                        return (
                                            <tr 
                                                key={line.id} 
                                                className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'}`}
                                            >
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-slate-800">{line.productName}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">Item Ref: {line.id.substring(0, 8)}</div>
                                                </td>
                                                <td className="py-4 px-4 text-center font-semibold text-slate-700">
                                                    {line.quantity}
                                                </td>
                                                <td className="py-4 px-4 text-right text-slate-600 font-mono text-xs">
                                                    {quote.currency} {Number(line.unitPrice || 0).toLocaleString()}
                                                    {line.discountPercent > 0 && (
                                                        <div className="text-[10px] text-emerald-600 font-sans font-bold">
                                                            -{line.discountPercent}% off
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-right font-bold text-slate-800 font-mono">
                                                    {quote.currency} {Number(line.lineTotal || 0).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleSelectLine(line.id);
                                                            setActiveTab('line_change');
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                            isSelected 
                                                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300' 
                                                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                        }`}
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        {isSelected ? 'Editing Line' : 'Request Change'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Quotation Financial Summary */}
                        <div className="p-6 bg-slate-50/60 border-t border-slate-100 flex flex-col items-end">
                            <div className="w-full max-w-sm space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span className="font-mono font-medium">{quote.currency} {Number(quote.subtotal || 0).toLocaleString()}</span>
                                </div>
                                {quote.discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-600 font-medium">
                                        <span>Total Discounts Applied</span>
                                        <span className="font-mono">-{quote.currency} {Number(quote.discountAmount || 0).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-600">
                                    <span>Estimated Tax</span>
                                    <span className="font-mono font-medium">{quote.currency} {Number(quote.taxAmount || 0).toLocaleString()}</span>
                                </div>
                                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                                    <span className="text-base font-bold text-slate-900">Grand Total</span>
                                    <span className="text-2xl font-black text-indigo-700 font-mono">
                                        {quote.currency} {Number(quote.totalAmount || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Prominent Action Button: Confirm Quotation */}
                            <div className="mt-6 w-full max-w-sm flex flex-col gap-2">
                                {!isConfirmed ? (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => setConfirmModalOpen(true)}
                                        className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 text-base"
                                    >
                                        <Check className="w-5 h-5 stroke-[2.5]" />
                                        Confirm Quotation
                                    </button>
                                ) : (
                                    <div className="w-full p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold text-sm flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        Quotation Already Confirmed
                                    </div>
                                )}
                                <p className="text-[11px] text-slate-400 text-center">
                                    * Confirming locks commercial terms. If terms exceed approval limits, quotation re-enters internal approval flow; otherwise moves directly to fulfillment.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quotation Terms & Notes */}
                    {quote.notes && (
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-slate-500" /> Commercial Notes & Terms
                            </h3>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
                        </div>
                    )}
                </div>

                {/* Right Column (5 cols): Negotiation & Change Request Tool */}
                <div className="lg:col-span-5 space-y-6">

                    {/* Change Request & Counter Tool Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-600" />
                                    Negotiation & Change Request Tool
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Submit line changes or counter discount proposals</p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-50/30">
                            <button
                                type="button"
                                onClick={() => setActiveTab('line_change')}
                                className={`flex-1 py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'line_change'
                                        ? 'border-indigo-600 text-indigo-700 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Line Change
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('counter_discount')}
                                className={`flex-1 py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'counter_discount'
                                        ? 'border-indigo-600 text-indigo-700 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Percent className="w-3.5 h-3.5" />
                                Counter Proposal
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('comment')}
                                className={`flex-1 py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                                    activeTab === 'comment'
                                        ? 'border-indigo-600 text-indigo-700 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Comment
                            </button>
                        </div>

                        <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
                            {/* Tab 1: Line Change Request */}
                            {activeTab === 'line_change' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Select Line Item to Modify
                                        </label>
                                        <select
                                            value={selectedLineId}
                                            onChange={(e) => handleSelectLine(e.target.value)}
                                            className="w-full text-sm font-medium border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        >
                                            {quote.lines?.map((l: any) => (
                                                <option key={l.id} value={l.id}>
                                                    {l.productName} (Current Qty: {l.quantity})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedLine && (
                                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs space-y-1">
                                            <div className="flex justify-between font-semibold text-slate-700">
                                                <span>Original Item:</span>
                                                <span className="text-indigo-900">{selectedLine.productName}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Current Quantity:</span>
                                                <span className="font-bold">{selectedLine.quantity} units</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Current Unit Price:</span>
                                                <span className="font-mono">{quote.currency} {Number(selectedLine.unitPrice || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Requested Quantity
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRequestedQty(Math.max(1, (Number(requestedQty) || 1) - 1))}
                                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center transition"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                value={requestedQty}
                                                onChange={(e) => setRequestedQty(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                                                placeholder="e.g. 10"
                                                className="flex-1 text-center font-bold text-base border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setRequestedQty((Number(requestedQty) || 0) + 1)}
                                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center transition"
                                            >
                                                +
                                            </button>
                                        </div>
                                        {selectedLine && requestedQty !== '' && Number(requestedQty) !== selectedLine.quantity && (
                                            <p className="text-[11px] text-indigo-600 font-medium mt-1 text-center">
                                                Adjusting from {selectedLine.quantity} to {requestedQty} units ({Number(requestedQty) > selectedLine.quantity ? `+${Number(requestedQty) - selectedLine.quantity}` : `${Number(requestedQty) - selectedLine.quantity}`})
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Change Details & Justification
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Specify reason for quantity adjustment, custom specifications, or packaging requirements..."
                                            className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Counter Discount Proposal Field */}
                            {activeTab === 'counter_discount' && (
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Counter Discount Proposal (%)
                                            </label>
                                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                Authorized Cap: Max {quote.maxDiscountPercent || 15}% Disc
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={requestedDiscount}
                                                onChange={(e) => setRequestedDiscount(e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value))))}
                                                placeholder="e.g. 20"
                                                className="w-full text-lg font-bold border border-slate-200 rounded-xl py-3 pl-4 pr-12 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                            />
                                            <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-base">%</span>
                                        </div>
                                    </div>

                                    {/* Exceeds max discount advisory */}
                                    {requestedDiscount !== '' && Number(requestedDiscount) > (quote.maxDiscountPercent || 15) && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                                            <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                                Exceeds Max Discount Limit ({quote.maxDiscountPercent || 15}%)
                                            </div>
                                            <p className="text-amber-800 text-[11px] leading-relaxed">
                                                Customer proposed {requestedDiscount}% discount. Because this discount is greater than your authorized max discount of {quote.maxDiscountPercent || 15}%, clicking <strong>Submit Request</strong> will send this request directly to the <strong>Sales Manager</strong> for executive approval, as implemented in quote creation.
                                            </p>
                                        </div>
                                    )}

                                    {/* Real-time simulation */}
                                    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-2 text-xs">
                                        <div className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Proposed Impact Preview
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Original Subtotal:</span>
                                            <span className="font-mono">{quote.currency} {Number(quote.subtotal || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-600 font-semibold">
                                            <span>Requested Discount ({requestedDiscount || 0}%):</span>
                                            <span className="font-mono">-{quote.currency} {Math.round(discountVal).toLocaleString()}</span>
                                        </div>
                                        <div className="pt-2 border-t border-indigo-100 flex justify-between font-bold text-slate-900 text-sm">
                                            <span>Simulated New Total:</span>
                                            <span className="font-mono text-indigo-700">{quote.currency} {Math.round(newTotal).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Proposal Rationale / Note
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Provide reasoning for proposed counter discount (e.g. competitive matching, budget limit, volume purchase)..."
                                            className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: General Comment */}
                            {activeTab === 'comment' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            General Inquiry or Terms Question
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Type your question or negotiation comment directly for the sales representative..."
                                            className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Feedback Notification */}
                            {submitFeedback && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                    {submitFeedback}
                                </div>
                            )}

                            {/* Action Button: Submit Request */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition flex items-center justify-center gap-2 text-sm shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                                {submitting ? 'Submitting Request...' : 'Submit Request'}
                            </button>
                        </form>
                    </div>

                    {/* Negotiation Thread History */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-slate-500" />
                                Negotiation Activity & Thread
                            </h4>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                {threads.length}
                            </span>
                        </div>

                        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
                            {threads.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs">
                                    No negotiation requests logged yet. Use the tool above to start discussions.
                                </div>
                            ) : (
                                threads.map((t: any) => {
                                    const isCustomer = t.actorType === 'CUSTOMER';
                                    return (
                                        <div
                                            key={t._id}
                                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                                                isCustomer
                                                    ? 'bg-indigo-50/40 border-indigo-100 ml-2'
                                                    : 'bg-slate-50 border-slate-200 mr-2'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`font-bold ${isCustomer ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                    {isCustomer ? 'You (Customer)' : 'Sales Representative'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Type Badge */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {t.type === 'CHANGE_REQUEST' && (
                                                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                                        <Edit3 className="w-3 h-3" /> Change Request
                                                    </span>
                                                )}
                                                {t.type === 'COUNTER_DISCOUNT' && (
                                                    <>
                                                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                                            <Percent className="w-3 h-3" /> Counter Discount ({t.requestedDiscountPercent}%)
                                                        </span>
                                                        {t.requestedDiscountPercent > (quote.maxDiscountPercent || 15) && (
                                                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                                                <ShieldAlert className="w-3 h-3" /> Exceeds Max ({quote.maxDiscountPercent || 15}%) → Sent to Sales Manager
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                {t.requestedQuantity && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[10px]">
                                                        Qty: {t.requestedQuantity}
                                                    </span>
                                                )}
                                                {t.lineId && (
                                                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                                                        Line: {quote.lines?.find((l: any) => l.id === t.lineId)?.productName || 'Specified Line'}
                                                    </span>
                                                )}

                                                {/* Decision Status Badges */}
                                                {t.status === 'ACCEPTED' && (
                                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                                        <Check className="w-3 h-3 text-emerald-600" /> Accepted
                                                    </span>
                                                )}
                                                {t.status === 'REJECTED' && (
                                                    <span className="bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3 text-red-600" /> Declined
                                                    </span>
                                                )}
                                                {t.status === 'OPEN' && (
                                                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                                                    </span>
                                                )}
                                                {t.status === 'RESOLVED' && (
                                                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">
                                                        Answered
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-slate-700 leading-relaxed mt-1">{t.message}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Quotation Confirmation Modal */}
            {confirmModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <Check className="w-6 h-6 stroke-[2.5]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Confirm Quotation Terms</h3>
                                <p className="text-xs text-slate-500">Quotation #{quote.quotationNumber}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs text-slate-600">
                            <div className="flex justify-between font-medium">
                                <span>Commercial Subtotal:</span>
                                <span className="font-mono text-slate-900">{quote.currency} {Number(quote.subtotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                                <span>Grand Total to Authorize:</span>
                                <span className="font-mono text-emerald-700 text-base">{quote.currency} {Number(quote.totalAmount || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                            <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-amber-700" /> Automated Workflow Rules
                            </div>
                            <p>
                                • <strong>Approval Escalation (B4):</strong> If final terms exceed approval thresholds, this quotation will automatically re-enter the internal approval chain for manager sign-off.
                            </p>
                            <p>
                                • <strong>Direct Fulfillment:</strong> Otherwise, your order will move directly into fulfillment and warehouse stock reservation.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmModalOpen(false)}
                                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmQuotation}
                                disabled={submitting}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Processing...' : 'Confirm & Proceed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
