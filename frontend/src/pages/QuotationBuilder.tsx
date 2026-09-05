import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Product {
    _id: string;
    name: string;
    sku: string;
    basePrice: number;
    costPrice: number;
}

export default function QuotationBuilder() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<any[]>([]);

    useEffect(() => {
        // Fetch products
        fetch('http://localhost:5000/api/config/products')
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error(err));
    }, []);

    const addToCart = (product: Product) => {
        setCart([...cart, { ...product, quantity: 1, discount: 0 }]);
    };

    const totals = cart.reduce((acc, item) => {
        const lineTotal = item.basePrice * item.quantity * (1 - item.discount / 100);
        const lineCost = item.costPrice * item.quantity;
        return {
            subtotal: acc.subtotal + (item.basePrice * item.quantity),
            total: acc.total + lineTotal,
            cost: acc.cost + lineCost,
        };
    }, { subtotal: 0, total: 0, cost: 0 });

    const margin = totals.total > 0 ? ((totals.total - totals.cost) / totals.total) * 100 : 0;

    // Dummy calculated score based on discount violations
    const riskScore = cart.reduce((acc, item) => acc + (item.discount > 10 ? 5 : 0), 0);

    return (
        <div className="flex h-screen bg-slate-50">
            <div className="flex-1 flex flex-col items-center py-10 px-4 overflow-auto">
                <div className="w-full max-w-5xl">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-slate-900 mb-2">← Back to Workspace</button>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Quotation</h1>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium bg-white hover:bg-slate-50 shadow-sm">Save Draft</button>
                            <button className="px-4 py-2 bg-slate-900 text-white rounded font-medium shadow hover:bg-slate-800">Submit for Approval</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-8 flex flex-col gap-6">
                            {/* Product Catalog */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Product Catalog</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {products.map(p => (
                                        <div key={p._id} className="border border-slate-200 p-4 rounded-lg flex justify-between items-end hover:shadow-md transition cursor-pointer" onClick={() => addToCart(p)}>
                                            <div>
                                                <div className="font-semibold text-slate-800">{p.name}</div>
                                                <div className="text-xs text-slate-500 mb-2">{p.sku}</div>
                                                <div className="text-blue-600 font-bold">${p.basePrice.toLocaleString()}</div>
                                            </div>
                                            <button className="px-3 py-1 bg-slate-100 font-medium text-sm rounded hover:bg-slate-200 shadow-sm">Add</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cart */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Line Items</h2>
                                {cart.length === 0 ? <p className="text-slate-400 text-sm">No items added.</p> : (
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-500">
                                                <th className="pb-3 font-medium">Product</th>
                                                <th className="pb-3 font-medium">Qty</th>
                                                <th className="pb-3 font-medium">Discount %</th>
                                                <th className="pb-3 font-medium text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.map((item, idx) => (
                                                <tr key={idx} className="border-b border-slate-100 last:border-0">
                                                    <td className="py-3 font-medium text-slate-800">{item.name}</td>
                                                    <td className="py-3"><input type="number" min="1" value={item.quantity} onChange={(e) => {
                                                        const newCart = [...cart];
                                                        newCart[idx].quantity = parseInt(e.target.value) || 1;
                                                        setCart(newCart);
                                                    }} className="w-16 p-1 border border-slate-300 rounded" /></td>
                                                    <td className="py-3"><input type="number" min="0" max="100" value={item.discount} onChange={(e) => {
                                                        const newCart = [...cart];
                                                        newCart[idx].discount = parseInt(e.target.value) || 0;
                                                        setCart(newCart);
                                                    }} className="w-20 p-1 border border-slate-300 rounded" /></td>
                                                    <td className="py-3 text-right font-bold text-slate-700">${(item.basePrice * item.quantity * (1 - item.discount / 100)).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Summary */}
                        <div className="col-span-4 flex flex-col gap-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Quotation Summary</h2>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">${totals.subtotal.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Discount Amount</span><span className="text-green-600 font-semibold">-${(totals.subtotal - totals.total).toLocaleString()}</span></div>
                                    <div className="pt-3 border-t border-slate-200 flex justify-between text-lg font-black"><span className="text-slate-900">Total</span><span className="text-slate-900">${totals.total.toLocaleString()}</span></div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-200">
                                    <h3 className="font-bold text-slate-800 mb-3">Deal Health</h3>

                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-1 font-medium"><span className="text-slate-500">Est. Margin</span><span className={margin > 20 ? 'text-green-600' : 'text-red-500'}>{margin.toFixed(1)}%</span></div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${margin > 20 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-1 font-medium"><span className="text-slate-500">Blended Risk Score</span><span className={riskScore > 0 ? 'text-amber-500' : 'text-slate-600'}>{riskScore}</span></div>
                                        {riskScore > 0 && <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded">Approval required by Sales Manager.</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
