import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ApprovalsList() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('All Pending');

    const tabs = ['All Pending', 'Finance', 'Sales Manager'];

    const approvals = [
        { id: 'Q-1042', customer: 'Acme Corp', date: 'Aug 24', margin: '32%', status: 'Sales Manager', assignedTo: 'M. Scott' },
        { id: 'Q-1088', customer: 'Beta Inc', date: 'Aug 21', margin: '14%', status: 'Finance', assignedTo: 'A. Bernard' },
        { id: 'Q-1092', customer: 'Zenith', date: 'Aug 20', margin: '48%', status: 'Sales Manager', assignedTo: 'M. Scott' },
    ];

    return (
        <div className="p-8 h-full flex flex-col text-slate-300">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Approvals (List)</h1>
                <p className="text-slate-400 text-sm">Every quotation that exceeded limits, or is going through standard approval.</p>
            </div>

            <div className="flex gap-3 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${activeTab === tab
                                ? 'bg-amber-600 text-white'
                                : tab === 'Finance'
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : tab === 'Sales Manager'
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : 'bg-white/10 text-slate-400 hover:bg-white/20'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-slate-400 bg-white/5">
                            <th className="p-4 font-semibold">Quotation ID</th>
                            <th className="p-4 font-semibold">Customer</th>
                            <th className="p-4 font-semibold">Request Date</th>
                            <th className="p-4 font-semibold">Margin</th>
                            <th className="p-4 font-semibold">Current Phase</th>
                            <th className="p-4 font-semibold">Assigned To</th>
                        </tr>
                    </thead>
                    <tbody>
                        {approvals.map(app => (
                            <tr
                                key={app.id}
                                onClick={() => navigate(`/workspace/approvals/${app.id}`)}
                                className="border-b border-white/5 hover:bg-[#252525] cursor-pointer transition"
                            >
                                <td className="p-4 font-medium text-blue-400">{app.id}</td>
                                <td className="p-4 text-white font-medium">{app.customer}</td>
                                <td className="p-4">{app.date}</td>
                                <td className="p-4">{app.margin}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${app.status === 'Finance' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                        }`}>
                                        {app.status}
                                    </span>
                                </td>
                                <td className="p-4">{app.assignedTo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 border-t border-white/10 text-xs text-slate-500">
                    Showing {approvals.length} pending items.
                </div>
            </div>
        </div>
    );
}
