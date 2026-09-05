import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function ApprovalDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const quoteId = id || 'Q-1042';

    const steps = [
        { label: 'Sales Rep Draft', status: 'completed' },
        { label: 'Sales Manager Approval', status: 'current' },
        { label: 'Finance Risk Check', status: 'pending' },
        { label: 'Customer Connect', status: 'pending' }
    ];

    return (
        <div className="p-8 h-full flex flex-col text-slate-300">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <div className="text-xl font-bold text-white mb-2">Approval Detail: {quoteId} (Acme Corp)</div>
                    <p className="text-slate-400 text-sm">Reviewing Blended Risk Score violations and margin compression requests.</p>
                </div>
                <button onClick={() => navigate('/workspace/approvals')} className="px-4 py-2 border border-white/20 text-slate-300 rounded font-medium hover:bg-white/10 transition text-sm">Cancel / Back</button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-5 border border-amber-500/30 rounded-xl bg-amber-500/5">
                    <h3 className="font-bold text-amber-500 mb-3 uppercase text-xs tracking-wider">Risk Factors Triggered</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm bg-black/20 p-2 rounded">
                            <span className="text-slate-300">Hardware Discount</span>
                            <span className="text-red-400 font-bold">40%  (Max 20%)</span>
                        </div>
                        <div className="flex justify-between text-sm bg-black/20 p-2 rounded">
                            <span className="text-slate-300">Margin Compression</span>
                            <span className="text-red-400 font-bold">14% (Min 25%)</span>
                        </div>
                    </div>
                </div>

                <div className="p-5 border border-white/10 rounded-xl bg-[#1A1A1A]">
                    <h3 className="font-bold text-slate-400 mb-3 uppercase text-xs tracking-wider">Approval Chain</h3>
                    <div className="flex items-center justify-between mt-6">
                        {steps.map((step, i) => (
                            <React.Fragment key={step.label}>
                                <div className="flex flex-col items-center relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 ${step.status === 'completed' ? 'bg-blue-600 text-white' :
                                            step.status === 'current' ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' :
                                                'bg-slate-700 text-slate-400'
                                        }`}>
                                        {step.status === 'completed' ? '✓' : i + 1}
                                    </div>
                                    <div className="text-xs text-center mt-2 w-20 leading-tight font-medium" style={{ color: step.status === 'current' ? 'white' : '#94a3b8' }}>
                                        {step.label}
                                    </div>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`flex-1 h-1 rounded -my-6 z-0 ${step.status === 'completed' ? 'bg-blue-600' : 'bg-slate-700'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 mb-8 flex-1">
                <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3 mb-4">Request Logs</h2>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-slate-500">
                            <th className="pb-2">Action</th>
                            <th className="pb-2">User</th>
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-white/5">
                            <td className="py-3 font-medium text-white">Submitted for Approval</td>
                            <td className="py-3">J. Doe (Rep)</td>
                            <td className="py-3">Aug 24, 10:45 AM</td>
                            <td className="py-3 text-slate-400">"Need this 40% discount to win the logo."</td>
                        </tr>
                    </tbody>
                </table>

                <div className="mt-8 pt-6 border-t border-white/10 gap-4 flex">
                    <button className="px-6 py-2.5 bg-green-600 text-white rounded font-medium shadow hover:bg-green-700 transition">Approve</button>
                    <button className="px-6 py-2.5 bg-amber-600 text-white rounded font-medium shadow hover:bg-amber-700 transition">Return for Revision</button>
                    <button className="px-6 py-2.5 bg-red-600 text-white rounded font-medium shadow hover:bg-red-700 transition">Reject</button>
                </div>
            </div>
        </div>
    );
}
