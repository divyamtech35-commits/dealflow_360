import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import client from '../api/client';

export default function InternalLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCreatingQuote, setIsCreatingQuote] = useState(false);

    const getNavItems = () => {
        const role = user?.role;

        // ADMIN PERSONA
        if (role === 'ADMIN') {
            return [
                { label: 'Products', path: '/internal/admin/products' },
                { label: 'Prices', path: '/internal/admin/prices' },
                { label: 'Discount Rules', path: '/internal/admin/discount-rules' },
                { label: 'Warehouses', path: '/internal/admin/warehouses' },
                { label: 'Subscription Plans', path: '/internal/admin/subscription-plans' },
            ];
        }

        // MANAGER PERSONA
        if (role === 'SALES_MANAGER' || role === 'FINANCE') {
            return [
                { label: 'Pending Approvals', path: '/internal/approvals' },
                { label: 'Deal Health', path: '/internal/approvals/health' },
            ];
        }

        // CUSTOMER PERSONA
        if (role === 'CUSTOMER') {
            return [
                { label: 'View Quote', path: '/internal/customer/quotes' },
                { label: 'Request Changes', path: '/internal/customer/request-changes' },
                { label: 'Counter Discount', path: '/internal/customer/counter-discount' },
                { label: 'Confirm Quote', path: '/internal/customer/confirm-quote' },
            ];
        }

        // SALES PERSON PERSONA (SALES_REP)
        return [
            { label: 'Dashboard', path: '/internal/dashboard' },
            { label: 'Quotations', path: '/internal/quotations' },
            { label: 'Fulfillment', path: '/internal/fulfillment' },
            { label: 'Billing', path: '/internal/billing' },
        ];
    };

    const navItems = getNavItems();

    const handleCreateQuote = async () => {
        setIsCreatingQuote(true);
        try {
            const res = await client.post('/quotations', { customerId: null });
            navigate(`/internal/quotations/${res.data.id}`);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to create quotation');
        } finally {
            setIsCreatingQuote(false);
        }
    };

    const getRoleBadgeStyle = (role?: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SALES_MANAGER':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'FINANCE':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'CUSTOMER':
                return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            case 'SALES_REP':
            default:
                return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const defaultDisplayName = user?.role === 'ADMIN' ? 'System Administrator' : user?.role === 'SALES_MANAGER' ? 'Dave Manager' : user?.role === 'FINANCE' ? 'Eve Finance' : user?.role === 'CUSTOMER' ? 'Acme Corp Customer' : 'Sales Rep';
    const defaultDisplayEmail = user?.role === 'ADMIN' ? 'admin@dealflow.com' : user?.role === 'SALES_MANAGER' ? 'manager@dealflow.com' : user?.role === 'FINANCE' ? 'finance@dealflow.com' : user?.role === 'CUSTOMER' ? 'buyer@acmecorp.com' : 'bob@dealflow.com';

    const userInitials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : user?.role === 'ADMIN' ? 'AD' : user?.role === 'SALES_MANAGER' ? 'MG' : user?.role === 'CUSTOMER' ? 'CU' : 'DF';

    const getPageTitle = (pathname: string) => {
        if (pathname.includes('/internal/customer/request-changes')) return 'Request Proposal Changes';
        if (pathname.includes('/internal/customer/counter-discount')) return 'Counter Discount & Budget';
        if (pathname.includes('/internal/customer/confirm-quote')) return 'Confirm & Accept Proposal';
        if (pathname.includes('/internal/customer/quotes')) return 'View Proposal Document';
        if (pathname.includes('/internal/admin/products')) return 'Master Catalog (Products)';
        if (pathname.includes('/internal/admin/prices')) return 'Pricing Multipliers';
        if (pathname.includes('/internal/admin/discount-rules')) return 'Discount Rules & Tiers';
        if (pathname.includes('/internal/admin/warehouses')) return 'Warehouses & Logistics Depots';
        if (pathname.includes('/internal/admin/subscription-plans')) return 'Subscription Plans & SLAs';
        if (pathname.includes('/internal/admin')) return 'Master Data Configuration';
        if (pathname.includes('/internal/dashboard')) return 'Sales Dashboard';
        if (pathname.match(/\/internal\/approvals\/[^/]+/)) return 'Deal Approval Review';
        if (pathname.includes('/internal/approvals/health')) return 'Deal Health Matrix';
        if (pathname.includes('/internal/approvals')) return 'Approval Queue';
        if (pathname.includes('/internal/fulfillment')) return 'Fulfillment & Stock Allocation';
        if (pathname.includes('/internal/billing')) return 'Contract Billing & Subscriptions';
        if (pathname.match(/\/internal\/quotations\/[^/]+/)) return 'Quotation Builder';
        if (pathname.includes('/internal/quotations')) return 'Quotations Pipeline';
        return 'Enterprise Portal';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 flex">
            {/* Desktop Fixed Sidebar */}
            <aside className="fixed left-0 top-0 z-30 hidden md:flex h-screen w-64 flex-col bg-[#0F172A] text-slate-300 border-r border-slate-800/80">
                {/* Brand Header */}
                <div className="h-20 shrink-0 flex items-center gap-3 px-6 border-b border-slate-800/80">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
                        {user?.role === 'ADMIN' ? 'AD' : user?.role === 'SALES_MANAGER' ? 'MG' : user?.role === 'CUSTOMER' ? 'CU' : 'DF'}
                    </div>
                    <div>
                        <div className="text-lg font-extrabold tracking-tight text-white leading-none">
                            DealFlow<span className="text-blue-400">360</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                            {user?.role === 'ADMIN' ? 'Admin Center' : user?.role === 'SALES_MANAGER' ? 'Management Center' : user?.role === 'CUSTOMER' ? 'Client Portal' : 'Sales Operations'}
                        </div>
                    </div>
                </div>

                {/* Nav items (Clean text navigation matching Mentor-Mentee-Portal) */}
                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                    {user?.role === 'SALES_REP' && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-3">
                            Navigation
                        </div>
                    )}
                    {navItems.map((item) => {
                        const isExact = location.pathname === item.path;
                        const isChild = item.path !== '/internal/dashboard' &&
                            location.pathname.startsWith(`${item.path}/`) &&
                            !(item.path === '/internal/approvals' && location.pathname.startsWith('/internal/approvals/health'));
                        const active = isExact || isChild;
                        return (
                            <NavLink
                                key={item.label}
                                to={item.path}
                                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    active
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                }`}
                            >
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Sidebar Quick Action - strictly for SALES_REP */}
                {user?.role === 'SALES_REP' && (
                    <div className="px-4 pb-4">
                        <button
                            onClick={handleCreateQuote}
                            disabled={isCreatingQuote}
                            className="group-btn relative w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center overflow-hidden disabled:opacity-50 cursor-pointer"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />
                            <span>{isCreatingQuote ? 'Creating...' : '+ New Quotation'}</span>
                        </button>
                    </div>
                )}

                {/* User Profile Card */}
                <div className="p-4 border-t border-slate-800/80 bg-[#0A0F1D]">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {userInitials}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-xs font-semibold text-white truncate">
                                {user?.name || defaultDisplayName}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                                {user?.email || defaultDisplayEmail}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden bg-slate-900/80 backdrop-blur-sm flex">
                    <div className="w-72 bg-[#0F172A] text-white h-full flex flex-col p-6">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                            <div className="text-lg font-bold text-white">DealFlow360</div>
                            <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white text-sm">
                                Close
                            </button>
                        </div>
                        <nav className="flex-1 py-6 space-y-2">
                            {navItems.map((item) => {
                                const isExact = location.pathname === item.path;
                                const isChild = item.path !== '/internal/dashboard' &&
                                    location.pathname.startsWith(`${item.path}/`) &&
                                    !(item.path === '/internal/approvals' && location.pathname.startsWith('/internal/approvals/health'));
                                const active = isExact || isChild;
                                return (
                                    <NavLink
                                        key={item.label}
                                        to={item.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                                            active
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                        <button
                            onClick={logout}
                            className="text-sm text-red-400 pt-4 border-t border-slate-800 text-left"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Main Application Container */}
            <div className="flex-1 flex flex-col min-w-0 md:ml-64">
                {/* Top Navbar (Clean text-focused) */}
                <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
                    {/* Left: Mobile button + Breadcrumbs */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg"
                        >
                            Menu
                        </button>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span>DealFlow360</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-800 font-semibold">
                                {getPageTitle(location.pathname)}
                            </span>
                        </div>
                    </div>

                    {/* Right: Role Badge, Logout */}
                    <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user?.role)}`}>
                            {user?.role || 'SALES_REP'}
                        </div>

                        <button
                            onClick={logout}
                            className="text-xs text-slate-500 hover:text-slate-900 font-medium px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                        >
                            Log out
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
