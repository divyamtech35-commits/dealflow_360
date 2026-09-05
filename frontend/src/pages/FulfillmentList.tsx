import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function FulfillmentList() {
    const navigate = useNavigate();

    const orders = [
        { id: 'Q-1033', customer: 'Delta Corp', date: 'Aug 23', status: 'Ready for Warehousing', next: 'Split Allocation' },
        { id: 'Q-1049', customer: 'Beta Inc', date: 'Aug 22', status: 'Allocated', next: 'Shipment' }
    ];

    return (
        <div className="p-8 h-full flex flex-col text-slate-300">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Fulfillment and Stock (List)</h1>
                <p className="text-slate-400 text-sm">Orders ready for warehouse, plus pending split allocations across facilities.</p>
            </div>

            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden mt-4">
                <div className="bg-white/5 p-4 border-b border-white/10 font-medium text-white">Orders Pending Fulfillment</div>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-slate-400 bg-[#1A1A1A]">
                            <th className="p-4 font-semibold">Order ID</th>
                            <th className="p-4 font-semibold">Customer</th>
                            <th className="p-4 font-semibold">Approval Date</th>
                            <th className="p-4 font-semibold">Fulfillment Status</th>
                            <th className="p-4 font-semibold">Next Steps</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(o => (
                            <tr
                                key={o.id}
                                onClick={() => navigate(`/workspace/fulfillment/${o.id}`)}
                                className="border-b border-white/5 hover:bg-[#252525] cursor-pointer transition"
                            >
                                <td className="p-4 font-medium text-blue-400">{o.id}</td>
                                <td className="p-4 text-white font-medium">{o.customer}</td>
                                <td className="p-4">{o.date}</td>
                                <td className="p-4"><span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-semibold">{o.status}</span></td>
                                <td className="p-4">{o.next}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
