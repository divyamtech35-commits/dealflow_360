import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Product {
    _id: string;
    name: string;
    sku: string;
    basePrice: number;
    costPrice: number;
    categoryId: any;
}

export default function QuotationBuilder() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<any[]>([]);

    // Example dummy related products for Upsell Panel based on wireframe
    const upsellProducts = [
        { title: 'Wireless Mouse', price: '$49.00' },
        { title: 'Docking Station', price: '$199.00' },
        { title: 'Glare Filter 15"', price: '$69.00' }
    ];

    useEffect(() => {
        fetch('http://localhost:5000/api/config/products')
            .then(r => r.json())
            .then(d => setProducts(d))
            .catch(e => console.error(e));

        // If ID is provided, fetch existing quote
        if (id && id !== 'new') {
            // Mocking for hackathon context, ideally we GET /api/quotes/:id
        }
    }, [id]);

    const addToCart = (product: Product) => {
        setCart([...cart, { ...product, productId: product._id, quantity: 1, discount: 0 }]);
    };

    const handleSaveDraft = async () => {
        try {
            await fetch('http://localhost:5000/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: null, lines: cart })
            });
            navigate('/workspace/quotations');
        } catch (e) {
            console.error(e);
        }
    };

    const totals = cart.reduce((acc, item) => ({
        subtotal: acc.subtotal + (item.basePrice * item.quantity),
        total: acc.total + (item.basePrice * item.quantity * (1 - item.discount / 100)),
    }), { subtotal: 0, total: 0 });

    return (
        <div className="p-8 h-full flex flex-col text-slate-300">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <div className="text-xl font-bold text-white mb-2">Quotation Detail: {id && id !== 'new' ? `Q-${id.substring(id.length - 6).toUpperCase()}` : 'New Quote'}</div>
                    <p className="text-slate-400 text-sm">Add previously cataloged CRM data to the Quotation for full tracking, apply discounts, review up-sells.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/workspace/quotations')} className="px-4 py-2 border border-white/20 text-slate-300 rounded font-medium hover:bg-white/10 transition text-sm">Cancel</button>
                    <button onClick={handleSaveDraft} className="px-4 py-2 bg-slate-700 text-white rounded font-medium hover:bg-slate-600 transition text-sm">Save Draft</button>
                    <button onClick={handleSaveDraft} className="px-4 py-2 bg-blue-600 text-white rounded font-medium shadow hover:bg-blue-700 transition text-sm">Submit for Approval</button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Customer Info Box */}
                <div className="p-5 border border-white/10 rounded-xl bg-[#1A1A1A]">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <label className="text-slate-500 font-medium w-32">Customer</label>
                            <div className="flex-1 bg-[#252525] border border-white/10 p-2 rounded text-white text-sm">Search Acme Corp...</div>
                        </div>
                        <div className="flex gap-2">
                            <label className="text-slate-500 font-medium w-32">Status</label>
                            <div className="flex-1 bg-[#252525] border border-white/10 p-2 rounded text-white text-sm">Draft</div>
                        </div>
                    </div>
                </div>

                {/* Pricing Config Box */}
                <div className="p-5 border border-white/10 rounded-xl bg-[#1A1A1A]">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <label className="text-slate-500 font-medium w-32">Price List</label>
                            <div className="flex-1 bg-[#252525] border border-white/10 p-2 rounded text-white text-sm">2026 Enterprise Global</div>
                        </div>
                        <div className="flex gap-2">
                            <label className="text-slate-500 font-medium w-32">Discount Tier</label>
                            <div className="flex-1 bg-[#252525] border border-white/10 p-2 rounded text-blue-400 font-semibold text-sm">Gold Tier (Max 15% Standard)</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col mb-6">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                    <h2 className="text-lg font-bold text-white">Line Items</h2>
                    <select onChange={(e) => {
                        const p = products.find(prod => prod._id === e.target.value);
                        if (p) addToCart(p);
                    }} value="" className="bg-[#252525] border border-white/10 rounded p-2 text-sm text-white">
                        <option value="" disabled>Search & Add Product...</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name} - ${p.basePrice}</option>)}
                    </select>
                </div>

                {cart.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No products added to quote.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-slate-500">
                                <th className="pb-3 font-medium">Product</th>
                                <th className="pb-3 font-medium">Qty</th>
                                <th className="pb-3 font-medium">Price</th>
                                <th className="pb-3 font-medium">Discount</th>
                                <th className="pb-3 font-medium">Total</th>
                                <th className="pb-3 font-medium text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((item, idx) => {
                                const lineTotal = item.basePrice * item.quantity * (1 - item.discount / 100);
                                const risk = item.discount > 10; // Simple mockup logic
                                return (
                                    <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                        <td className="py-4 font-medium text-white">{item.name}</td>
                                        <td className="py-4">
                                            <input type="number" value={item.quantity} onChange={(e) => {
                                                const c = [...cart]; c[idx].quantity = Number(e.target.value) || 1; setCart(c);
                                            }} className="w-16 bg-[#252525] border border-white/10 p-1.5 rounded text-white" />
                                        </td>
                                        <td className="py-4">${item.basePrice.toLocaleString()}</td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <input type="number" value={item.discount} onChange={(e) => {
                                                    const c = [...cart]; c[idx].discount = Number(e.target.value) || 0; setCart(c);
                                                }} className="w-16 bg-[#252525] border border-white/10 p-1.5 rounded text-white" /> %
                                            </div>
                                        </td>
                                        <td className="py-4 font-bold text-white">${lineTotal.toLocaleString()}</td>
                                        <td className="py-4 text-right">
                                            {risk ? <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded font-medium">Risk Flag</span> : <span className="text-slate-500 text-xs text-green-500">OK</span>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}

                <div className="mt-4 border-t border-white/10 pt-4 text-right">
                    <div className="text-sm text-slate-500 mb-1">Subtotal: ${totals.subtotal.toLocaleString()}</div>
                    <div className="text-xl font-bold text-white">Total: ${totals.total.toLocaleString()}</div>
                </div>
            </div>

            {/* Upsell Panel */}
            <div className="border border-blue-500/30 rounded-xl bg-[#1A2235] p-5">
                <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2">🚀 Upsell and Cross-Sell Suggestions</h3>
                <div className="grid grid-cols-3 gap-4">
                    {upsellProducts.map(up => (
                        <div key={up.title} className="p-4 border border-blue-500/20 bg-blue-500/5 rounded-lg flex items-center justify-between hover:bg-blue-500/10 cursor-pointer transition">
                            <div>
                                <div className="font-semibold text-white text-sm mb-0.5">+ {up.title}</div>
                                <div className="text-xs text-blue-300">{up.price}</div>
                            </div>
                            <button className="text-xs px-2 py-1 border border-blue-400 text-blue-400 rounded hover:bg-blue-500 hover:text-white transition">Add</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
