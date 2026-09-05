import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function InternalLayout() {
    const { user, logout } = useAuth();

    const getNavItems = () => {
        const role = user?.role;
        const baseNav = [
            { label: 'Dashboard', path: '/internal/dashboard' },
            { label: 'Quotations', path: '/internal/quotations' },
        ];
        if (role === 'SALES_MANAGER' || role === 'FINANCE') {
            baseNav.push({ label: 'Approvals', path: '/internal/approvals' });
        }
        if (role === 'ADMIN') {
            baseNav.push({ label: 'Backend Config', path: '/internal/backend' });
        }
        return baseNav;
    };

    return (
        <div className="min-h-screen bg-[#121212] text-slate-200 font-sans flex flex-col">
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#1A1A1A]">
                <div className="flex items-center gap-8">
                    <div className="text-xl font-bold tracking-tight text-white">DealFlow360 Internal</div>
                    <nav className="flex items-center gap-2">
                        {getNavItems().map((item) => (
                            <NavLink
                                key={item.label}
                                to={item.path}
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
                    <div className="text-sm font-medium text-amber-500">{user?.role}</div>
                    <button onClick={logout} className="text-xs px-3 py-1.5 border border-white/20 rounded hover:bg-white/10 transition text-slate-300">Logout</button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-8">
                <Outlet />
            </main>
        </div>
    );
}
