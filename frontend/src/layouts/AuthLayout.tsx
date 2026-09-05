import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, Zap, Layers, TrendingUp, CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    const location = useLocation();
    const isSignUp = location.pathname.includes('/signup');

    return (
        <div className="w-full h-full min-h-screen max-h-screen flex bg-white overflow-hidden selection:bg-blue-100 selection:text-blue-900 relative">
            {/* Form Column - Left on Sign In, Right on Sign Up (on desktop) */}
            <div
                className={`w-full md:w-1/2 lg:w-[48%] xl:w-[42%] bg-white flex flex-col justify-between p-6 sm:p-8 lg:px-10 lg:py-6 relative overflow-x-hidden overflow-y-auto max-h-screen z-10 shrink-0 ${
                    isSignUp ? 'md:order-2 md:ml-auto' : 'md:order-1'
                }`}
            >
                {children}
            </div>

            {/* Visual Hero Showcase Panel - Right on Sign In, Left on Sign Up (on desktop) */}
            <div
                className={`hidden md:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#090D16] via-[#0F172A] to-[#1E293B] text-white p-10 lg:p-14 flex-col justify-between select-none ${
                    isSignUp ? 'md:order-1' : 'md:order-2'
                }`}
            >
                {/* Ambient Radial Spotlight Orbs */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Subtle Grid Pattern Overlay */}
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
                        <Zap className="w-3.5 h-3.5 text-blue-400" />
                        Enterprise CPQ & Deal Execution
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        System Operational
                    </div>
                </div>

                {/* Main Hero Showcase Center */}
                <div className="relative z-10 max-w-xl my-auto py-8">
                    <h2 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.15] text-white mb-5">
                        Accelerate Deal Velocity from{' '}
                        <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                            Quote to Cash.
                        </span>
                    </h2>
                    <p className="text-slate-300 text-sm lg:text-base leading-relaxed mb-8">
                        Precision margin controls, automated tiered approval workflows, and multi-warehouse fulfillment designed for modern enterprise revenue teams.
                    </p>

                    {/* Bento Feature Grid */}
                    <div className="grid grid-cols-1 gap-3.5">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md hover:bg-white/[0.07] transition-colors">
                            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">Dynamic Margin & Discount Guardrails</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                    Instant tier pricing checks, automated manager escalations, and strict margin protection.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md hover:bg-white/[0.07] transition-colors">
                            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">AI Upsell & Cross-Sell Recommendations</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                    Context-aware attach rate suggestions to maximize total contract and subscription revenue.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md hover:bg-white/[0.07] transition-colors">
                            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">Multi-Warehouse Inventory & Invoicing</h4>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                    Real-time stock reservation, split depot allocations, and automated recurring billing.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Trust Row */}
                <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Role-Based Permissions (Admin, Rep, Manager, Finance, Customer)</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">DealFlow360 v1.0</span>
                </div>
            </div>
        </div>
    );
}
