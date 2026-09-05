import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function FulfillmentDetail() {
    const navigate = useNavigate();
    const { id } = useParams();

    return (
        <div className="p-8 h-full flex flex-col text-slate-300">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <div className="text-xl font-bold text-white mb-2">Fulfillment Detail: {id || 'Q-1033'} (Delta Corp)</div>
                    <p className="text-slate-400 text-sm">Optimize delivery by splitting stock across multiple warehouses.</p>
                </div>
                <button onClick={() => navigate('/workspace/fulfillment')} className="px-4 py-2 border border-white/20 text-slate-300 rounded font-medium hover:bg-white/10 transition text-sm">Cancel / Back</button>
            </div>

            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 mb-4">Stock Allocation (Item: Enterprise Server - 15 units required)</h2>

                <table className="w-full text-left text-sm mb-6">
                    <thead>
                        <tr className="text-slate-400 bg-white/5">
                            <th className="p-3">Warehouse Location</th>
                            <th className="p-3">Total Available</th>
                            <th className="p-3">Qty Allocated</th>
                            <th className="p-3 text-right">Logistics Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-white/5">
                            <td className="p-3 font-medium text-white">West Coast Hub</td>
                            <td className="p-3">10 units</td>
                            <td className="p-3">
                                <input type="number" defaultValue="10" className="bg-[#252525] border border-white/10 p-1 w-20 rounded text-center text-white" />
                            </td>
                            <td className="p-3 text-right font-medium">$450.00</td>
                        </tr>
                        <tr className="border-b border-white/5">
                            <td className="p-3 font-medium text-white">East Coast Facility</td>
                            <td className="p-3">25 units</td>
                            <td className="p-3">
                                <input type="number" defaultValue="5" className="bg-[#252525] border border-white/10 p-1 w-20 rounded text-center text-white" />
                            </td>
                            <td className="p-3 text-right font-medium text-amber-500">$950.00 (Cross-region)</td>
                        </tr>
                    </tbody>
                </table>

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-sm mb-6">
                    <strong>Constraint:</strong> Primary warehouse lacks sufficient inventory. Suggested cross-region split applied routing 5 units from East Coast.
                </div>

                <div className="pt-4 flex gap-4">
                    <button className="px-6 py-2.5 bg-blue-600 text-white rounded font-medium shadow hover:bg-blue-700 transition">Accept Suggested Split</button>
                    <button className="px-6 py-2.5 border border-white/20 text-white rounded font-medium hover:bg-white/10 transition">Manual Override</button>
                </div>
            </div>
        </div>
    );
}
