import { Outlet } from 'react-router-dom';

const PortalLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 flex flex-col">
            {/* Distinct Branding / No Internal Nav */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        DF
                    </div>
                    <span className="font-semibold text-xl tracking-tight text-slate-800">DealFlow Enterprise</span>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Secure Customer Portal
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                <Outlet />
            </main>

            <footer className="py-6 text-center text-slate-400 text-sm">
                &copy; {new Date().getFullYear()} DealFlow Enterprise. All rights reserved. Secure Portal Env.
            </footer>
        </div>
    );
};

export default PortalLayout;
