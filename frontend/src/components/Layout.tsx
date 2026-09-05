import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function Layout() {
    const navigate = useNavigate();
    const navItems = [
        { label: 'Dashboard', path: '/workspace' },
        { label: 'Quotations', path: '/workspace/quotations' },
        { label: 'Approvals', path: '/workspace/approvals' },
        { label: 'Fulfillment', path: '/workspace/fulfillment' },
        { label: 'Subscriptions', path: '/workspace/subscriptions' },
        { label: 'Billing', path: '/workspace/billing' },
        { label: 'Invoices', path: '/workspace/invoices' },
        { label: 'Deal Health', path: '/workspace/health' },
        { label: 'Reports', path: '/workspace/reports' },
        { label: 'Product', path: '/workspace/product' }
    ];

    return (
        <div className="min-h-screen bg-[#121212] text-slate-200 font-sans flex flex-col">
            {/* Top App Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#1A1A1A]">
                <div className="flex items-center gap-8">
                    <div className="text-xl font-bold tracking-tight text-white">DealFlow360</div>

                    {/* Top Navigation Bar from Mockup */}
                    <nav className="flex items-center gap-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.label}
                                to={item.path}
                                end={item.path === '/workspace'}
                                className={({ isActive }) =>
                                    `px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-400">Sales Rep</div>
                    <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-xs px-3 py-1.5 border border-white/20 rounded hover:bg-white/10 transition text-slate-300">Logout</button>
                </div>
            </header>

            {/* Page Content area */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
