import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-wide">Sales Dashboard / Home</h1>
                <p className="text-slate-400 text-sm mt-1">Consolidated view over all things available below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="p-6 rounded-xl border border-white/10 bg-[#1A1A1A] hover:bg-[#202020] transition cursor-pointer">
                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Pending Approvals</div>
                    <div className="text-3xl font-bold text-white">4</div>
                    <div className="text-xs text-amber-500 mt-2 flex items-center gap-1">⚠ 2 approvals waiting</div>
                </div>

                <div onClick={() => navigate('/workspace/quotations')} className="p-6 rounded-xl border border-blue-500/50 bg-[#1A1A1A] hover:bg-[#202020]/90 transition cursor-pointer relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition" />
                    <div className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-2 relative z-10">Open Quotations</div>
                    <div className="text-3xl font-bold text-white relative z-10">17</div>
                    <div className="text-xs text-slate-400 mt-2 relative z-10">12 active drafts</div>
                </div>

                <div className="p-6 rounded-xl border border-red-500/30 bg-[#1A1A1A] hover:bg-[#202020] transition cursor-pointer">
                    <div className="text-sm font-medium text-red-400 uppercase tracking-wider mb-2">At Risk Deals</div>
                    <div className="text-3xl font-bold text-white">2</div>
                    <div className="text-xs text-slate-400 mt-2">Flagged by Risk Score</div>
                </div>
            </div>

            <div className="flex gap-4 mb-12 border-b border-white/10 pb-8">
                <button onClick={() => navigate('/workspace/quote/new')} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow font-medium hover:bg-blue-700 transition">
                    + New Quotation
                </button>
                <button className="px-6 py-2 border border-white/20 text-slate-300 rounded-lg hover:bg-white/5 transition">
                    View Approvals
                </button>
            </div>

            <div>
                <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
                <div className="space-y-3 pl-4 border-l-2 border-white/10">
                    <div className="relative pl-6">
                        <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-green-500" />
                        <p className="text-slate-300"><span className="font-semibold text-white">Acme Corp</span> quotation approved by Manager.</p>
                        <p className="text-xs text-slate-500 mt-0.5">2 hours ago</p>
                    </div>
                    <div className="relative pl-6">
                        <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-blue-500" />
                        <p className="text-slate-300"><span className="font-semibold text-white">Beta Industries</span> requested a discount change.</p>
                        <p className="text-xs text-slate-500 mt-0.5">5 hours ago</p>
                    </div>
                    <div className="relative pl-6">
                        <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-500" />
                        <p className="text-slate-300"><span className="font-semibold text-white">Zenith Deal</span> status updated to Under BOM Review.</p>
                        <p className="text-xs text-slate-500 mt-0.5">Yesterday</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
