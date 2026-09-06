import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { LogOut, ShieldCheck, Sparkles, LayoutDashboard } from 'lucide-react';

const PortalLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isDashboard = location.pathname === '/portal/dashboard';

    const tierName = user?.tier?.name || 'Standard';
    const tierDiscount = user?.tier?.maxDiscountPercent;

    return (
        <div className="min-h-screen bg-slate-50/80 font-sans text-slate-900 selection:bg-indigo-100 flex flex-col">
            {/* Top Enterprise Portal Navigation */}
            <header className="bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3.5 shadow-xs sticky top-0 z-30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/portal/dashboard" className="flex items-center gap-2.5 hover:opacity-95 transition-opacity">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
                            DF
                        </div>
                        <div>
                            <div className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-tight">
                                DealFlow<span className="text-indigo-600">360</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                                Customer Commercial Portal
                            </div>
                        </div>
                    </Link>

                    {/* Navigation Pills */}
                    <nav className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200">
                        <Link
                            to="/portal/dashboard"
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                isDashboard
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            Commercial Center
                        </Link>
                    </nav>
                </div>

                {/* Right Profile & Tier Controls */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                    {/* Customer Tier Pill */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 rounded-full text-xs font-semibold text-slate-700 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{tierName} Partner</span>
                        {tierDiscount !== undefined && (
                            <span className="text-[10px] text-indigo-600 font-bold bg-white/90 px-1.5 py-0.5 rounded-full border border-indigo-100">
                                {tierDiscount}% Pre-Approved
                            </span>
                        )}
                    </div>

                    {/* Account Identity */}
                    <div className="text-xs font-bold text-slate-700 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="max-w-[140px] truncate">{user?.name || user?.email || 'Customer'}</span>
                    </div>

                    {/* Sign Out Button */}
                    <button
                        onClick={logout}
                        title="Sign out of customer portal"
                        className="text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50/50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-medium cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>

            <footer className="py-6 text-center text-slate-400 text-xs border-t border-slate-200/60 bg-white/50">
                &copy; {new Date().getFullYear()} DealFlow360 Enterprise CPQ & Fulfillment Engine. Secure Customer Portal.
            </footer>
        </div>
    );
};

export default PortalLayout;
