import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../store/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password123'); // Default for hackathon ease
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await client.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);
            navigate('/internal/dashboard');
        } catch (err) {
            alert('Login failed');
        }
    };

    const quickLogin = async (email: string) => {
        try {
            const res = await client.post('/auth/login', { email, password: 'password123' });
            login(res.data.token, res.data.user);
            navigate('/internal/dashboard');
        } catch (err) {
            alert(`Failed quick login as ${email}`);
        }
    };

    return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#121212]">
            <form onSubmit={handleLogin} className="p-8 bg-[#1A1A1A] rounded-xl border border-white/10 w-96 flex flex-col gap-4 mb-4">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">DealFlow360 Login</h2>
                <input className="p-2 bg-[#252525] rounded text-white border border-white/10" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                <input className="p-2 bg-[#252525] rounded text-white border border-white/10" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                <button className="bg-blue-600 text-white p-2 rounded mt-2 hover:bg-blue-700 font-medium">Secure Login</button>
            </form>

            <div className="w-96 p-4 bg-[#1A1A1A] border border-white/10 rounded-xl mb-4">
                <h3 className="text-xs uppercase text-slate-500 font-bold mb-3 text-center">Role-Based Quick Access (Hackathon)</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => quickLogin('rep@dealflow.com')} className="p-2 border border-white/10 rounded text-sm font-medium text-white hover:bg-white/10">Sales Rep</button>
                    <button type="button" onClick={() => quickLogin('manager@dealflow.com')} className="p-2 border border-white/10 rounded text-sm font-medium text-white hover:bg-amber-500/20 hover:text-amber-400">Sales Manager</button>
                    <button type="button" onClick={() => quickLogin('finance@dealflow.com')} className="p-2 border border-white/10 rounded text-sm font-medium text-white hover:bg-red-500/20 hover:text-red-400">Finance</button>
                    <button type="button" onClick={() => quickLogin('admin@dealflow.com')} className="p-2 border border-white/10 rounded text-sm font-medium text-white hover:bg-emerald-500/20 hover:text-emerald-400">Admin</button>
                </div>
            </div>

            <div className="text-slate-400 text-sm">
                No account? <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
            </div>
        </div>
    );
}
