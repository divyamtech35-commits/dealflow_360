import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuotationsList() {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:5000/api/quotes')
            .then(r => r.json())
            .then(d => setQuotes(d))
            .catch(e => console.error(e));
    }, []);

    const cols = [
        { title: 'Draft', status: 'Draft' },
        { title: 'Pending Approval', status: 'Pending Approval' },
        { title: 'Approved', status: 'Approved' },
        { title: 'Negotiation', status: 'Negotiation' },
        { title: 'Confirmed', status: 'Confirmed' }
    ];

    return (
        <div className="p-8 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white">Quotations (List)</h1>
                    <p className="text-slate-400 text-sm mt-1">Every quotation in the system over the last two quarters. Click Cards to open it.</p>
                </div>
                <button onClick={() => navigate('/workspace/quote/new')} className="px-5 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700">
                    + New Quotation
                </button>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-4 h-full min-w-max">
                    {cols.map(col => (
                        <div key={col.title} className="w-[300px] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1A]">
                            <div className="p-4 border-b border-white/10 bg-white/5 rounded-t-xl text-sm font-semibold text-slate-300">
                                {col.title}
                            </div>
                            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                {/* Live DB quotes */}
                                {quotes.filter(q => q.status === col.status).map(q => (
                                    <div key={q._id} onClick={() => navigate(`/workspace/quote/${q._id}`)} className="p-4 rounded-lg bg-[#252525] border border-white/5 shadow-sm cursor-pointer hover:border-white/20 transition group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-500 group-hover:bg-blue-500 transition-colors" />
                                        <div className="text-xs text-slate-400 mb-1">Q-{q._id.substring(q._id.length - 6).toUpperCase()}</div>
                                        <div className="font-semibold text-white truncate">{q.customerId?.companyName || 'Unknown Customer'}</div>
                                        <div className="text-xs mt-3 flex justify-between items-center text-slate-400">
                                            <span>Risk: {q.blendedRiskScore}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty state padding just to look good in mockup */}
                                {quotes.filter(q => q.status === col.status).length === 0 && (
                                    <div className="p-4 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-slate-500 text-xs text-center h-24">
                                        No {col.title.toLowerCase()} quotes
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
