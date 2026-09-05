import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function FulfillmentScreen() {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [plan, setPlan] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusNote, setStatusNote] = useState<string | null>(null);

    const fetchQuotes = async () => {
        setIsLoading(true);
        try {
            const res = await client.get('/quotations?status=APPROVED');
            setQuotes((res.data || []).filter((q: any) => q.status === 'APPROVED'));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    const processSplit = async (quote: any) => {
        setIsProcessing(true);
        setStatusNote(null);
        try {
            // Create Order
            let orderRes;
            try {
                orderRes = await client.post(`/orders/from-quotation/${quote._id}`);
            } catch (e: any) {
                if (e.response?.status === 400 && e.response?.data?.error === 'Order already exists for this quotation') {
                    alert('Order already exists for this quotation.');
                    return;
                }
                throw e;
            }

            const order = orderRes.data;
            setSelectedOrder(order);

            // Fetch Plan
            const planRes = await client.get(`/orders/${order._id}/split-plan`);
            setPlan(planRes.data);
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.error || 'Failed to process split plan');
        } finally {
            setIsProcessing(false);
        }
    };

    const acceptPlan = async () => {
        if (!selectedOrder) return;
        setIsProcessing(true);
        try {
            await client.post(`/orders/${selectedOrder._id}/accept-split`);
            setStatusNote('Fulfillment plan accepted and inventory reserved across warehouses!');
            setPlan(null);
            setSelectedOrder(null);
            fetchQuotes();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to accept split plan');
        } finally {
            setIsProcessing(false);
        }
    };

    if (plan && selectedOrder) {
        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                onClick={() => setPlan(null)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                                ← Back to Queue
                            </button>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                Stock Split & Routing
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Order {selectedOrder.orderNumber || 'SO-NEW'}
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Multi-warehouse stock allocation and courier optimization.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPlan(null)}
                            className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition"
                        >
                            Cancel Plan
                        </button>
                    </div>
                </div>

                {/* Warehouse Allocation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plan.allocations?.map((a: any, i: number) => (
                        <div
                            key={i}
                            className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <h3 className="font-bold text-slate-900 text-sm">
                                            {a.warehouseName}
                                        </h3>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        In Stock
                                    </span>
                                </div>

                                <div className="space-y-2.5 mb-6">
                                    {a.lines?.map((l: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between items-center bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 text-xs"
                                        >
                                            <span className="font-semibold text-slate-800">{l.productName}</span>
                                            <span className="font-black text-slate-900">Qty: {l.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                    Courier Shipping Cost
                                </span>
                                <span className="font-black text-slate-900 text-sm">
                                    ${Number(a.shipmentCost || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Backorders Card */}
                    {plan.backorders && plan.backorders.length > 0 && plan.backorders.map((a: any, i: number) => (
                        <div
                            key={`bo-${i}`}
                            className="bg-red-50/60 border border-red-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-red-200/60 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                        <h3 className="font-bold text-red-900 text-sm">
                                            Backorder Allocation
                                        </h3>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                                        Pending Restock
                                    </span>
                                </div>

                                <div className="space-y-2.5 mb-6">
                                    {a.lines?.map((l: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-200 text-xs"
                                        >
                                            <span className="font-semibold text-red-950">{l.productName}</span>
                                            <span className="font-black text-red-600">x{l.quantity} pending</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-red-200/60 text-xs text-red-700 font-medium">
                                Split shipment will trigger automatically once restock lands.
                            </div>
                        </div>
                    ))}
                </div>

                {/* Confirm Routing Bar */}
                <div className="bg-white border border-blue-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div>
                        <h4 className="text-slate-900 font-bold text-base">
                            Confirm Smart Fulfillment Routing
                        </h4>
                        <p className="text-slate-500 text-xs mt-0.5">
                            Total Deliveries: <span className="font-bold text-slate-800">{plan.shipmentCount || 1} Shipments</span> • Estimated Shipping: <span className="font-bold text-slate-800">${Number(plan.totalShippingCost || 0).toFixed(2)}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setPlan(null)}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={acceptPlan}
                            disabled={isProcessing}
                            className="group-btn relative flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition overflow-hidden cursor-pointer"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />
                            <span>{isProcessing ? 'Reserving Inventory...' : 'Accept & Reserve Stock'}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            {/* Header */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Logistics & Warehousing
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">
                            Fulfillment Center
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Fulfillment Queue
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                        Approved quotations ready for warehouse stock reservation, backorder isolation, and carrier dispatch.
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

            {statusNote && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                    <span>{statusNote}</span>
                    <button onClick={() => setStatusNote(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-4">✕</button>
                </div>
            )}

            {/* Approved Quotes Grid */}
            {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading approved fulfillment queue...</div>
            ) : quotes.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <h3 className="text-base font-bold text-slate-800">No Approved Quotes Pending Fulfillment</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Once quotations complete manager and finance approvals, they will appear here ready for warehouse routing.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {quotes.map(q => (
                        <div
                            key={q._id}
                            className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-xs font-bold text-blue-600 tracking-wider">
                                        {q.quotationNumber}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {q.status}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-slate-900">
                                    {q.customerName || 'Enterprise Customer'}
                                </h3>

                                <div className="text-xs text-slate-400 flex items-center gap-4 mt-1">
                                    <span>Total: <span className="font-semibold text-slate-700">${Number(q.totalAmount || 0).toLocaleString()}</span></span>
                                    <span>•</span>
                                    <span>Margin: <span className="font-semibold text-emerald-600">{q.marginPct?.toFixed(1)}%</span></span>
                                </div>
                            </div>

                            <button
                                onClick={() => processSplit(q)}
                                disabled={isProcessing}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer self-stretch sm:self-auto text-center"
                            >
                                Plan Order Split →
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

