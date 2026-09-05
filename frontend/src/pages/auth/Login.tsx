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

    return (
        <div className="flex h-screen items-center justify-center bg-[#121212] flex-col">
            <form onSubmit={handleLogin} className="p-8 bg-[#1A1A1A] rounded-xl border border-white/10 w-96 flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">DealFlow360 Login</h2>
                <input className="p-2 bg-[#252525] rounded text-white border border-white/10" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                <input className="p-2 bg-[#252525] rounded text-white border border-white/10" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                <button className="bg-blue-600 text-white p-2 rounded mt-2 hover:bg-blue-700 font-medium">Secure Login</button>
            </form>
            <div className="mt-4 text-slate-400 text-sm">
                No account? <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
            </div>
        </div>
    );
}
