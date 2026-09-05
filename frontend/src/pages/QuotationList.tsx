import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function QuotationList() {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        client.get('/quotations')
            .then(r => setQuotes(r.data || []))
            .catch(e => console.error(e))
            .finally(() => setIsLoading(false));
    }, []);

    const handleCreateQuote = async () => {
        setIsCreating(true);
        try {
            const res = await client.post('/quotations', { customerId: null });
            navigate(`/internal/quotations/${res.data.id}`);
        } catch (e: any) {
            alert(e.response?.data?.message || e.message);
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SUBMITTED':
            case 'PENDING_APPROVAL':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'REJECTED':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'DRAFT':
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const filteredQuotes = quotes.filter(q => {
        const matchesSearch = (q.quotationNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (q.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Quotations Pipeline
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        Track, manage, and configure client proposals across all lifecycle stages.
                    </p>
                </div>

                <button
                    onClick={handleCreateQuote}
                    disabled={isCreating}
                    className="group-btn relative px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto cursor-pointer"
                >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />
                    <span>{isCreating ? 'Creating...' : '+ New Quotation'}</span>
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filter by quote number or customer name..."
                        className="w-full px-4 py-2 bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                                statusFilter === status
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {status === 'ALL' ? 'All Quotes' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quotations Grid */}
            {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading quotations...</div>
            ) : filteredQuotes.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <h3 className="text-base font-bold text-slate-800">No matching quotations found</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                        {searchTerm ? 'Try adjusting your search criteria.' : 'Create a new quotation to kick off your deal.'}
                    </p>
                    <button
                        onClick={handleCreateQuote}
                        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                    >
                        + Create First Quote
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredQuotes.map((q) => (
                        <div
                            key={q.id}
                            onClick={() => navigate(`/internal/quotations/${q.id}`)}
                            className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-blue-600 tracking-wider">
                                        {q.quotationNumber || 'QT-DRAFT'}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(q.status)}`}>
                                        {q.status}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                                    {q.customerName || 'Draft Customer'}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Enterprise Quotation
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Value</div>
                                    <div className="text-lg font-black text-slate-900">{q.totalFormatted || '$0.00'}</div>
                                </div>
                                <div className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                                    Configure →
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
