import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function QuotationList() {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<any[]>([]);

    useEffect(() => {
        client.get('/quotations')
            .then(r => setQuotes(r.data))
            .catch(e => console.error(e));
    }, []);

    return (
        <div className="h-full flex flex-col text-slate-300">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Quotations Pipeline</h1>
                    <p className="text-slate-400 text-sm">Every draft and active quotation.</p>
                </div>
                <button onClick={async () => {
                    try {
                        const res = await client.post('/quotations', { customerId: null });
                        navigate(`/internal/quotations/${res.data.id}`);
                    } catch (e: any) { alert(e.message); }
                }} className="px-5 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700">
                    + New Quote
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotes.map(q => (
                    <div key={q.id} onClick={() => navigate(`/internal/quotations/${q.id}`)} className="p-5 rounded-xl bg-[#1A1A1A] border border-white/10 hover:border-white/30 cursor-pointer transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-xs text-blue-400 font-semibold mb-1">{q.quotationNumber || 'QT-0000'}</div>
                                <div className="text-white font-medium text-lg">{q.customerName}</div>
                            </div>
                            <span className="px-2 py-1 bg-white/10 text-white rounded text-xs font-semibold">{q.status}</span>
                        </div>
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                            <div className="text-white font-bold text-xl">{q.totalFormatted}</div>
                            <div className="text-xs text-slate-500">Activity: {new Date(q.lastActivityAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
