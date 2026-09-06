import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../store/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState(() => localStorage.getItem('dealflow_remembered_email') || '');
    const [password, setPassword] = useState('password123');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('dealflow_remembered_email'));
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [infoMsg, setInfoMsg] = useState('');

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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        setInfoMsg('');

        try {
            const res = await client.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);

            // Persist or clear remembered email
            if (rememberMe) {
                localStorage.setItem('dealflow_remembered_email', email);
            } else {
                localStorage.removeItem('dealflow_remembered_email');
            }

            // Role-aware landing navigation:
            if (res.data.user.role === 'CUSTOMER') {
                navigate('/portal/dashboard', { replace: true });
            } else if (res.data.user.role === 'ADMIN') {
                navigate('/internal/admin/products', { replace: true });
            } else {
                navigate('/internal/dashboard', { replace: true });
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
            <div className="w-full max-w-[400px] mx-auto my-auto flex flex-col gap-4 sm:gap-5 z-10 py-2">
                {/* Header */}
                <div className="flex flex-col gap-1 select-none">
                    <span className="text-slate-500 text-sm font-medium">
                        Welcome back!
                    </span>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Please Sign In
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Enter your credentials to access your workspace.
                    </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                        {errorMsg}
                    </div>
                )}

                {/* Info / Hint Banner */}
                {infoMsg && (
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-medium">
                        {infoMsg}
                    </div>
                )}

                {/* 1-Click Demo Persona Selector */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Demo Personas
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">1-click autofill</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                        {[
                            { label: 'Sales Rep', email: 'rep@dealflow360.com', activeStyle: 'hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/40' },
                            { label: 'Manager', email: 'manager@dealflow360.com', activeStyle: 'hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50/40' },
                            { label: 'Finance', email: 'finance@dealflow360.com', activeStyle: 'hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/40' },
                            { label: 'Admin', email: 'admin@dealflow360.com', activeStyle: 'hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/40' },
                            { label: 'Customer', email: 'customer1@dealflow360.com', activeStyle: 'hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/40' },
                        ].map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => {
                                    setEmail(p.email);
                                    setPassword('password123');
                                    setErrorMsg('');
                                    setInfoMsg(`Autofilled ${p.label} account (${p.email})`);
                                }}
                                className={`px-1.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/80 text-slate-600 transition-all text-center truncate cursor-pointer ${p.activeStyle} ${email === p.email ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-xs' : ''}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

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
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            placeholder="e.g. rep@dealflow360.com or admin@dealflow360.com"
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
                                className="w-full pl-4 pr-12 py-3 bg-white hover:bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200 shadow-sm disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        <button
                            type="button"
                            onClick={() => {
                                setErrorMsg('');
                                setInfoMsg('Default credentials for demo accounts: password123 (or contact system administrator).');
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-semibold bg-transparent border-0 p-0"
                        >
                            Forgot password?
                        </button>
                    </div>

                    {/* Submit Button with High-Tech Shimmer */}
                    <div className="relative p-[1.5px] rounded-xl overflow-hidden mt-3 group-btn w-full shadow-md">
                        {/* Conic rotating border glow */}
                        <div className="absolute -inset-[300%] bg-[conic-gradient(from_0deg,transparent_30%,#93C5FD_50%,transparent_70%)] animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[11px] font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer overflow-hidden shadow-sm"
                        >
                            {/* Shimmer sweep on hover */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />

                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing In...
                                </>
                            ) : (
                                "Sign In"
                            )}
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
