import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function ApprovalQueue() {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<any[]>([]);

    useEffect(() => {
        client.get('/approvals/queue')
            .then(r => setQuotes(r.data))
            .catch(e => console.error(e));
    }, []);

    return (
        <div className="h-full flex flex-col text-slate-300">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">My Approval Queue</h1>
                <p className="text-slate-400 text-sm">Quotations waiting specifically for your role's sign-off.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotes.map(q => (
                    <div key={q.id} onClick={() => navigate(`/internal/approvals/${q.id}`)} className="p-5 rounded-xl bg-[#1A1A1A] border border-white/10 hover:border-amber-500/30 cursor-pointer transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-xs text-amber-400 font-semibold mb-1">{q.quotationNumber}</div>
                                <div className="text-white font-medium text-lg">{q.customerName}</div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded text-xs font-semibold mb-1">
                                    Risk: {q.riskScore}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                            <div className="text-white font-bold text-xl">{q.totalFormatted}</div>
                            <div className="text-xs text-slate-500">Wait: {Math.floor((Date.now() - new Date(q.lastActivityAt).getTime()) / (1000 * 60 * 60))} hours</div>
                        </div>
                    </div>
                ))}

                {quotes.length === 0 && (
                    <div className="col-span-3 py-12 text-center border-2 border-dashed border-white/10 rounded-xl text-slate-500 font-medium">
                        Your queue is completely clear.
                    </div>
                )}
            </div>
        </div>
    );
}
