import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password123');
    const [role, setRole] = useState('SALES_REP');
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await client.post('/auth/signup', { name, email, password, role });
            alert('Signed up successfully!');
            navigate('/login');
        } catch (err) {
            alert('Signup failed');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-[#121212] flex-col">
            <form onSubmit={handleSignup} className="p-8 bg-[#1A1A1A] rounded-xl border border-white/10 w-96 flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Create Account</h2>
                <input className="p-2 bg-[#252525] rounded text-white border border-white/10" value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
                <input className="p-2 bg-[#252525] rounded text-white border border-white/10" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                <input className="p-2 bg-[#252525] rounded text-white border border-white/10" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />

                <select className="p-2 bg-[#252525] rounded text-white border border-white/10" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="SALES_REP">Sales Rep</option>
                    <option value="SALES_MANAGER">Sales Manager</option>
                    <option value="FINANCE">Finance</option>
                    <option value="ADMIN">Admin</option>
                    <option value="CUSTOMER">Customer</option>
                </select>

                <button className="bg-amber-600 text-white p-2 rounded mt-2 hover:bg-amber-700 font-medium">Sign Up</button>
            </form>
            <div className="mt-4 text-slate-400 text-sm">
                Already have an account? <Link to="/login" className="text-amber-400 hover:underline">Log in</Link>
            </div>
        </div>
    );
}
