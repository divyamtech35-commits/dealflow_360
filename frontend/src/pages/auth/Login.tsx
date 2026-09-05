import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../store/AuthContext';

const PERSONAS = [
    { id: 'rep', label: 'Sales Person', email: 'rep@dealflow.com', role: 'SALES_REP', desc: 'Dashboard & CPQ' },
    { id: 'manager', label: 'Manager', email: 'manager@dealflow.com', role: 'SALES_MANAGER', desc: 'Approvals & Health' },
    { id: 'admin', label: 'Admin', email: 'admin@dealflow.com', role: 'ADMIN', desc: 'Master Data' },
    { id: 'customer', label: 'Customer', email: 'buyer@acmecorp.com', role: 'CUSTOMER', desc: 'Proposals & Portal' },
];

export default function Login() {
    const [email, setEmail] = useState('buyer@acmecorp.com');
    const [password, setPassword] = useState('password123');
    const [selectedPersona, setSelectedPersona] = useState('customer');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left - 150,
            y: e.clientY - rect.top - 150,
        });
    };

    const handleSelectPersona = (p: typeof PERSONAS[0]) => {
        setSelectedPersona(p.id);
        setEmail(p.email);
        setPassword('password123');
        setErrorMsg('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            const res = await client.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);

            // Role-aware landing navigation matching 4-persona hierarchy:
            if (res.data.user.role === 'CUSTOMER') {
                navigate('/internal/customer/quotes');
            } else if (res.data.user.role === 'SALES_MANAGER' || res.data.user.role === 'FINANCE') {
                navigate('/internal/approvals');
            } else if (res.data.user.role === 'ADMIN') {
                navigate('/internal/admin/products');
            } else {
                navigate('/internal/dashboard');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Invalid email or password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="flex flex-col justify-between h-full relative"
        >
            {/* Interactive Spotlight Glow following cursor */}
            <div
                style={{
                    transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
                    opacity: isHovering ? 1 : 0,
                }}
                className="absolute w-[300px] h-[300px] bg-blue-500/[0.04] rounded-full blur-[65px] pointer-events-none z-0 hidden md:block transition-opacity duration-300 left-0 top-0"
            />

            {/* Top Branding & Navigation Row */}
            <div className="flex items-center justify-between w-full z-10 select-none mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
                        D3
                    </div>
                    <div>
                        <div className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                            DealFlow<span className="text-blue-600">360</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium tracking-wide">
                            Enterprise CPQ Platform
                        </div>
                    </div>
                </div>

                <Link
                    to="/signup"
                    className="px-5 py-2 border border-blue-600/40 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm"
                >
                    Sign Up
                </Link>
            </div>

            {/* Central Login Card */}
            <div className="w-full max-w-[430px] mx-auto my-auto flex flex-col gap-4 sm:gap-5 z-10 py-2">
                {/* Header */}
                <div className="flex flex-col gap-1 select-none">
                    <span className="text-slate-500 text-sm font-medium">
                        Welcome back!
                    </span>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Please Sign In
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Choose your persona to access your dedicated workspace.
                    </p>
                </div>

                {/* 4-Persona Quick Switcher (Strictly Icon-Free) */}
                <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Select Demo Persona:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {PERSONAS.map(p => {
                            const isSelected = selectedPersona === p.id || email === p.email;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectPersona(p)}
                                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                                            : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                            {p.label}
                                        </span>
                                        {isSelected && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{p.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                        {errorMsg}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {/* Email Input */}
                    <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Email address
                        </label>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                const match = PERSONAS.find(p => p.email === e.target.value);
                                setSelectedPersona(match ? match.id : '');
                            }}
                            disabled={isLoading}
                            placeholder="e.g. buyer@acmecorp.com"
                            className="w-full px-4 py-3 bg-white hover:bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200 shadow-sm disabled:opacity-50"
                        />
                    </div>

                    {/* Password Input */}
                    <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Password
                        </label>
                        <div className="relative flex items-center w-full">
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                placeholder="••••••••••••"
                                className="w-full pl-4 pr-16 py-3 bg-white hover:bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200 shadow-sm disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {/* Checkbox & Forgot Password */}
                    <div className="flex justify-between items-center w-full text-xs mt-1">
                        <label className="flex items-center gap-2 text-slate-600 select-none cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                            />
                            <span>Remember me</span>
                        </label>
                        <span
                            onClick={() => alert('For demo personas, default password is: password123')}
                            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-semibold"
                        >
                            Forgot password?
                        </span>
                    </div>

                    {/* Submit Button with High-Tech Shimmer */}
                    <div className="relative p-[1.5px] rounded-xl overflow-hidden mt-2 group-btn w-full shadow-md">
                        <div className="absolute -inset-[300%] bg-[conic-gradient(from_0deg,transparent_30%,#93C5FD_50%,transparent_70%)] animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[11px] font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer overflow-hidden shadow-sm"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />

                            {isLoading ? "Signing In..." : "Sign In"}
                        </button>
                    </div>
                </form>

                {/* Footer Switch */}
                <div className="text-center text-xs text-slate-500 pt-2">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                        Sign up
                    </Link>
                </div>
            </div>

            {/* Footer Copyright */}
            <div className="text-[11px] text-slate-400 font-medium select-none z-10 w-full text-center pt-2">
                © {new Date().getFullYear()} DealFlow360 Enterprise ERP. All rights reserved.
            </div>
        </div>
    );
}
