import React, { useEffect, useState } from 'react';
import client from '../api/client';

export default function FulfillmentScreen() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [plan, setPlan] = useState<any>(null);

    const fetchQuotes = async () => {
        try {
            const res = await client.get('/quotations?status=APPROVED');
            setQuotes(res.data.filter((q: any) => q.status === 'APPROVED'));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchQuotes(); }, []);

    const processSplit = async (quote: any) => {
        try {
            // Create Order
            let orderRes;
            try {
                orderRes = await client.post(`/orders/from-quotation/${quote._id}`);
            } catch (e: any) {
                if (e.response?.status === 400 && e.response?.data?.error === 'Order already exists for this quotation') {
                    // Hack for demo: assume we just get split plan directly if we had a GET /orders/by-quotation logic.
                    alert("Order exists. This demo expects fresh quotes.");
                    return;
                }
                throw e;
            }

            const order = orderRes.data;
            setSelectedOrder(order);

            // Fetch Plan
            const planRes = await client.get(`/orders/${order._id}/split-plan`);
            setPlan(planRes.data);

        } catch (e) {
            console.error(e);
            alert("Failed to process split");
        }
    };

    const acceptPlan = async () => {
        if (!selectedOrder) return;
        try {
            await client.post(`/orders/${selectedOrder._id}/accept-split`);
            alert("Fulfillment plan accepted and stock reserved!");
            setPlan(null);
            setSelectedOrder(null);
            fetchQuotes(); // Refresh
        } catch (e: any) {
            alert(e.response?.data?.error || "Failed to accept split");
        }
    };

    if (plan && selectedOrder) {
        return (
            <div className="p-8 text-slate-300">
                <h1 className="text-2xl font-bold text-white mb-2">Fulfillment Layout</h1>
                <p className="text-slate-400 mb-8">Order: {selectedOrder.orderNumber}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {plan.allocations.map((a: any, i: number) => (
                        <div key={i} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    <span className="text-emerald-500">📍</span> {a.warehouseName}
                                </h3>
                            </div>
                            <div className="space-y-3 mb-6">
                                {a.lines.map((l: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded">
                                        <span className="text-sm">{l.productName}</span>
                                        <span className="font-bold">x{l.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-xs text-slate-500 uppercase font-bold">Courier Cost</span>
                                <span className="font-mono text-emerald-400">${a.shipmentCost.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}

                    {plan.backorders.length > 0 && plan.backorders.map((a: any, i: number) => (
                        <div key={`bo-${i}`} className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 translate-x-8 -translate-y-8 rotate-45"></div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-red-500 text-lg flex items-center gap-2">
                                    <span className="text-red-500 text-xl">⚠️</span> Backorder
                                </h3>
                            </div>
                            <div className="space-y-3 mb-6">
                                {a.lines.map((l: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-red-500/10 p-2 rounded border border-red-500/20">
                                        <span className="text-sm text-red-100">{l.productName}</span>
                                        <span className="font-bold text-red-400">x{l.quantity} pending</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-red-500/20 text-xs text-red-400">
                                Awaiting restock to fulfill.
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-[#1A1A1A] border border-blue-500/30 p-6 rounded-xl flex items-center justify-between shadow-[0_0_30px_rgba(37,99,235,0.1)]">
                    <div>
                        <h4 className="text-white font-bold text-lg mb-1">Confirm Smart Routing</h4>
                        <p className="text-slate-400 text-sm">Totals: {plan.shipmentCount} Shipments, ${plan.totalShippingCost} Shipping Cost</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setPlan(null)} className="px-6 py-2 rounded font-bold text-slate-300 hover:text-white transition">Cancel</button>
                        <button onClick={acceptPlan} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-2 rounded shadow-lg transition-transform hover:scale-105 active:scale-95">Accept & Reserve</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 text-slate-300">
            <h1 className="text-2xl font-bold text-white mb-6">Fulfillment Queue</h1>
            {quotes.length === 0 ? (
                <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-8 text-center text-slate-500">
                    No approved quotations pending fulfillment.
                </div>
            ) : (
                <div className="space-y-4">
                    {quotes.map(q => (
                        <div key={q._id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5 flex items-center justify-between hover:bg-[#202020] transition-colors">
                            <div>
                                <div className="text-white font-bold text-lg mb-1">{q.quotationNumber} - {q.customerName}</div>
                                <div className="text-sm text-slate-400 flex gap-4">
                                    <span>Total: ${q.totalAmount.toLocaleString()}</span>
                                    <span>Margin: {q.marginPct?.toFixed(1)}%</span>
                                </div>
                            </div>
                            <button onClick={() => processSplit(q)} className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2 rounded transition-colors">
                                Plan Split →
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
