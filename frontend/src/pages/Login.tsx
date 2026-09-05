import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('customer1@dealflow360.com');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                const data = await res.json();
                login(data.token, data.user);
                
                if (data.user.role === 'CUSTOMER') {
                    navigate('/portal/dashboard', { replace: true });
                } else {
                    navigate('/internal/dashboard', { replace: true });
                }
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Server Error');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-100">
                <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Welcome to DealFlow360</h1>
                {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
