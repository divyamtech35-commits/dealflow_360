import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import client from '../api/client';
import { LogOut } from 'lucide-react';

export default function InternalLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCreatingQuote, setIsCreatingQuote] = useState(false);

    const getNavItems = () => {
        const role = user?.role;

        if (role === 'ADMIN') {
            return [
                { label: 'Products', path: '/internal/admin/products' },
                { label: 'Customers', path: '/internal/admin/customers' },
                { label: 'Price Lists', path: '/internal/admin/prices' },
                { label: 'Discount Tiers', path: '/internal/admin/discount-rules' },
                { label: 'Approval Chains', path: '/internal/admin/approval-chains' },
                { label: 'Warehouses', path: '/internal/admin/warehouses' },
                { label: 'Inventory', path: '/internal/admin/inventory' },
                { label: 'Subscription Plans', path: '/internal/admin/subscription-plans' },
            ];
        }

        const items = [
            { label: 'Dashboard', path: '/internal/dashboard' },
        ];

        if (role === 'SALES_REP') {
            items.push({ label: 'Quotations', path: '/internal/quotations' });
        }

        if (role === 'SALES_MANAGER' || role === 'FINANCE') {
            items.push({ label: 'Approvals', path: '/internal/approvals' });
            items.push({ label: 'Fulfillment', path: '/internal/fulfillment' });
        }

        if (role === 'FINANCE') {
            items.push({ label: 'Subscription & Billing', path: '/internal/billing' });
        }

        return items;
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
            case 'SALES_REP':
            default:
                return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const userInitials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
        : (user?.role === 'ADMIN' ? 'AD' : 'DF');

    const getPageTitle = (pathname: string) => {
        if (pathname.includes('/internal/dashboard')) return 'Sales Dashboard';
        if (pathname.match(/\/internal\/approvals\/[^/]+/)) return 'Deal Approval Review';
        if (pathname.includes('/internal/approvals')) return 'Approval Queue';
        if (pathname.includes('/internal/fulfillment')) return 'Fulfillment & Stock Allocation';
        if (pathname.match(/\/internal\/quotations\/[^/]+/)) return 'Quotation Builder';
        if (pathname.includes('/internal/quotations')) return 'Quotations Pipeline';
        if (pathname.includes('/internal/admin/products')) return 'Master Data - Products';
        if (pathname.includes('/internal/admin/customers')) return 'Master Data - Customers & Accounts';
        if (pathname.includes('/internal/admin/prices')) return 'Master Data - Price Lists';
        if (pathname.includes('/internal/admin/discount-rules')) return 'Master Data - Discount Tiers';
        if (pathname.includes('/internal/admin/approval-chains')) return 'Master Data - Approval Chains';
        if (pathname.includes('/internal/admin/warehouses')) return 'Master Data - Warehouses';
        if (pathname.includes('/internal/admin/inventory')) return 'Master Data - Inventory Allocations';
        if (pathname.includes('/internal/admin/subscription-plans')) return 'Master Data - Subscription Plans';
        if (pathname.includes('/internal/admin')) return 'Master Data Configuration';
        if (pathname.includes('/internal/backend')) return 'System Configuration';
        return user?.role === 'ADMIN' ? 'Admin Master Data' : 'Sales Operations';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 flex">
            {/* Desktop Fixed Sidebar */}
            <aside className="fixed left-0 top-0 z-30 hidden md:flex h-screen w-64 flex-col bg-[#0F172A] text-slate-300 border-r border-slate-800/80">
                {/* Brand Header */}
                <div className="h-20 shrink-0 flex items-center gap-3 px-6 border-b border-slate-800/80">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
                        D3
                    </div>
                    <div>
                        <div className="text-lg font-extrabold tracking-tight text-white leading-none">
                            DealFlow<span className="text-blue-400">360</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                            {user?.role === 'ADMIN' ? 'Admin Portal' : 'Sales Operations'}
                        </div>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-3">
                        {user?.role === 'ADMIN' ? 'MASTER DATA' : 'NAVIGATION'}
                    </div>
                    {navItems.map((item) => {
                        const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
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

                {/* Sidebar Quick Action */}
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

                {/* User Profile Card & Logout */}
                <div className="p-4 border-t border-slate-800/80 bg-[#0A0F1D]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {userInitials}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-xs font-semibold text-white truncate">
                                    {user?.name || (user?.role === 'ADMIN' ? 'System Admin' : 'Sales Rep')}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                    {user?.email || (user?.role === 'ADMIN' ? 'admin@dealflow360.com' : 'rep@dealflow.com')}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            title="Sign out of workspace"
                            className="text-xs text-slate-400 hover:text-red-400 hover:underline px-2 py-1 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign out</span>
                        </button>
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
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.label}
                                    to={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800"
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                        <button
                            onClick={logout}
                            className="text-sm text-red-400 pt-4 border-t border-slate-800 text-left flex items-center gap-2 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
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

                    {/* Right: Role & Status Badge */}
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${getRoleBadgeStyle(user?.role)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                            {user?.role ? user.role.replace(/_/g, ' ') : 'SALES REP'}
                        </div>
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
