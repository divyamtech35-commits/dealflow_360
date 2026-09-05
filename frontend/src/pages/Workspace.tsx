import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Workspace() {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl z-10 flex flex-col">
                <div className="text-2xl font-black tracking-tight mb-10 text-white/90">DealFlow<span className="text-blue-400">360</span></div>
                <nav className="flex-1 space-y-2">
                    <a href="#" className="block px-4 py-3 rounded-lg bg-white/10 text-white font-medium transition-colors">Quotations</a>
                    <a href="#" className="block px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">Pipeline</a>
                    <a href="#" className="block px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">Dashboard</a>
                </nav>
                <div className="mt-auto pt-6 border-t border-white/10">
                    <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="w-full px-4 py-2 text-sm text-slate-400 hover:text-white flex items-center justify-between">
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white px-8 py-5 border-b border-slate-200 flex items-center justify-between shadow-sm z-0">
                    <h1 className="text-xl font-bold text-slate-800">Quotes Pipeline</h1>
                    <button onClick={() => navigate('/workspace/quote/new')} className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg shadow-sm hover:bg-blue-700 hover:shadow transition-all">
                        + New Quotation
                    </button>
                </header>

                {/* Board */}
                <div className="flex-1 overflow-auto p-8">
                    <div className="flex gap-6 h-full items-start">

                        {/* Column 1 */}
                        <div className="flex-shrink-0 w-80 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-100/50 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Draft <span className="text-slate-400 font-normal ml-1">2</span></h3>
                            </div>
                            <div className="p-3 space-y-3 flex-1 overflow-y-auto min-h-[200px]">
                                {/* Card */}
                                <div onClick={() => navigate('/workspace/quote/123')} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-medium text-slate-400">#QF-001</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">Draft</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-base mb-1">Acme Corp</h4>
                                    <div className="text-lg font-black text-slate-900">$1,450.00</div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="flex-shrink-0 w-80 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-100/50 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Pending Approval <span className="text-slate-400 font-normal ml-1">1</span></h3>
                            </div>
                            <div className="p-3 space-y-3 flex-1 overflow-y-auto min-h-[200px]">
                                {/* Card */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-200 cursor-pointer hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-medium text-slate-400">#QF-002</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Review</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-base mb-1">Beta Industries</h4>
                                    <div className="text-lg font-black text-slate-900">$12,050.00</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
