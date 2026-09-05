import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function CustomerDashboard() {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await client.get('/portal/dashboard');
                setQuotations(res.data.quotations);
                setOrders(res.data.orders);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return <div className="text-center p-12 text-slate-400">Loading portal...</div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto mt-8">
            {/* Quotations Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Your Commercial Proposals & Quotations</h2>
                        <p className="text-xs text-slate-400 mt-1">Review, counter-offer, or confirm deals directly</p>
                    </div>
                </div>
                <div className="p-6">
                    {quotations.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-400">
                            No quotations currently available for review.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {quotations.map(q => (
                                <div key={q.id} onClick={() => navigate(`/portal/quotations/${q.id}`)} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all">
                                    <div>
                                        <div className="font-bold text-slate-800">{q.quotationNumber}</div>
                                        {q.validUntil && (
                                            <div className="text-xs text-slate-500 mt-1">Valid until {new Date(q.validUntil).toLocaleDateString()}</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-indigo-700">{q.currency} {q.totalAmount.toLocaleString()}</div>
                                        <div className={`mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${q.status === 'UNDER_NEGOTIATION' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {q.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Orders Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Order Fulfillment & Shipments</h2>
                            <p className="text-xs text-slate-400 mt-1">Warehouse stock reservation and backorder tracking</p>
                        </div>
                        <a href="#" className="text-xs font-bold text-indigo-600 hover:underline">Details</a>
                    </div>
                    <div className="p-6">
                        {orders.length === 0 ? (
                            <div className="py-12 text-center text-sm text-slate-400">
                                No active shipments in transit.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {orders.map(o => {
                                    const fulfilledQty = o.orderLines?.reduce((sum: number, l: any) => sum + l.quantity, 0) || 0; // naive assumption for demo
                                    return (
                                        <div key={o._id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-800">{o.orderNumber}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                                    o.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' :
                                                    o.status === 'PARTIALLY_FULFILLED' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>{o.status.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div className="flex gap-4 text-xs text-slate-500">
                                                <span>Shipments: <span className="font-semibold text-slate-700">{o.shipmentCount || 0}</span></span>
                                                {o.hasBackorder && (
                                                    <span className="text-amber-600 font-semibold">• Has Backordered Items</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Invoices Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Invoices & Statements</h2>
                            <p className="text-xs text-slate-400 mt-1">View invoices and settle balances</p>
                        </div>
                        <a href="#" className="text-xs font-bold text-indigo-600 hover:underline">Billing Center</a>
                    </div>
                    <div className="p-6">
                        <div className="py-12 text-center text-sm text-slate-400">
                            No invoices currently billed.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
