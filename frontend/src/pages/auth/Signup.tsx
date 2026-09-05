import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password123');
    const [role, setRole] = useState('SALES_REP');
    const [company, setCompany] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const navigate = useNavigate();

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left - 150,
            y: e.clientY - rect.top - 150,
        });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            await client.post('/auth/signup', { name, email, password, role, company });
            setSuccessMsg('Account created successfully! Redirecting to sign in...');
            setTimeout(() => {
                navigate('/login');
            }, 1200);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Failed to create account. Please try again.');
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
            <div className="flex items-center justify-between w-full z-10 select-none mb-4">
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
                    to="/login"
                    className="px-5 py-2 border border-blue-600/40 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm"
                >
                    Sign In
                </Link>
            </div>

            {/* Central Registration Card */}
            <div className="w-full max-w-[420px] mx-auto my-auto flex flex-col gap-5 z-10 py-2">
                {/* Header */}
                <div className="flex flex-col gap-1 select-none">
                    <span className="text-slate-500 text-sm font-medium">Get started</span>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Create an Account
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Set up an internal sales account or customer quotation portal.
                    </p>
                </div>

                {/* Status Banners */}
                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
                    {/* Full Name */}
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Full Name
                        </label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            placeholder="e.g. John Doe"
                            className="w-full px-4 py-2.5 bg-white hover:bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200 shadow-sm disabled:opacity-50"
                        />
                    </div>

                    {/* Email Input */}
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Work Email
                        </label>
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            placeholder="e.g. name@company.com"
                            className="w-full px-4 py-2.5 bg-white hover:bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200 shadow-sm disabled:opacity-50"
                        />
                    </div>

                    {/* Role & Company Row */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                Account Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                disabled={isLoading}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 text-xs font-medium shadow-sm"
                            >
                                <option value="SALES_REP">Sales Rep</option>
                                <option value="SALES_MANAGER">Sales Manager</option>
                                <option value="FINANCE">Finance</option>
                                <option value="ADMIN">Admin</option>
                                <option value="CUSTOMER">Customer</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                Company / Team
                            </label>
                            <input
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                disabled={isLoading}
                                placeholder="e.g. Global Tech"
                                className="w-full px-3 py-2.5 bg-white hover:bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 text-xs transition-all duration-200 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="flex flex-col gap-1 w-full">
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
                                className="w-full pl-4 pr-12 py-2.5 bg-white hover:bg-slate-50/40 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 text-sm transition-all duration-200 shadow-sm disabled:opacity-50"
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

                    {/* Submit Button with High-Tech Shimmer */}
                    <div className="relative p-[1.5px] rounded-xl overflow-hidden mt-3 group-btn w-full shadow-md">
                        <div className="absolute -inset-[300%] bg-[conic-gradient(from_0deg,transparent_30%,#93C5FD_50%,transparent_70%)] animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[11px] font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer overflow-hidden shadow-sm"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />

                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating Account...
                                </>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Create Account <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer Switch */}
                <div className="text-center text-xs text-slate-500 pt-2">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                        Sign In
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
