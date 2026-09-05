import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../store/AuthContext';

interface AdminConfigProps {
    tab?: 'PRODUCTS' | 'CUSTOMERS' | 'PRICES' | 'DISCOUNTS' | 'APPROVALS' | 'WAREHOUSES' | 'INVENTORY' | 'PLANS';
}

export default function AdminConfig({ tab }: AdminConfigProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CUSTOMERS' | 'PRICES' | 'DISCOUNTS' | 'APPROVALS' | 'WAREHOUSES' | 'INVENTORY' | 'PLANS'>(tab || 'PRODUCTS');

    useEffect(() => {
        if (tab) {
            setActiveTab(tab);
        }
    }, [tab]);

    const handleTabChange = (newTab: 'PRODUCTS' | 'CUSTOMERS' | 'PRICES' | 'DISCOUNTS' | 'APPROVALS' | 'WAREHOUSES' | 'INVENTORY' | 'PLANS') => {
        setActiveTab(newTab);
        const routeMap: Record<string, string> = {
            PRODUCTS: '/internal/admin/products',
            CUSTOMERS: '/internal/admin/customers',
            PRICES: '/internal/admin/prices',
            DISCOUNTS: '/internal/admin/discount-rules',
            APPROVALS: '/internal/admin/approval-chains',
            WAREHOUSES: '/internal/admin/warehouses',
            INVENTORY: '/internal/admin/inventory',
            PLANS: '/internal/admin/subscription-plans',
        };
        navigate(routeMap[newTab] || '/internal/admin/products');
    };

    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [discountRules, setDiscountRules] = useState<any[]>([]);
    const [approvalChain, setApprovalChain] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for CRUD
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    const fetchData = () => {
        setIsLoading(true);
        Promise.all([
            client.get('/config/products').catch(() => ({ data: [] })),
            client.get('/config/customers').catch(() => ({ data: [] })),
            client.get('/config/discount-rules').catch(() => ({ data: [] })),
            client.get('/config/approval-chain').catch(() => ({ data: [] })),
            client.get('/config/warehouses').catch(() => ({ data: [] })),
            client.get('/config/plans').catch(() => ({ data: [] })),
            client.get('/config/inventory').catch(() => ({ data: [] }))
        ]).then(([prodRes, custRes, discRes, appRes, wareRes, planRes, invRes]) => {
            setProducts(prodRes.data || []);
            setCustomers(custRes.data || []);
            setDiscountRules(discRes.data || []);
            setApprovalChain(appRes.data || []);
            setWarehouses(wareRes.data || []);
            setPlans(planRes.data || []);
            setInventory(invRes.data || []);
        }).finally(() => {
            setIsLoading(false);
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreateModal = () => {
        setEditItem(null);
        if (activeTab === 'WAREHOUSES') {
            setFormData({
                code: '',
                name: '',
                address: '',
                shippingCostWeight: 1,
                isActive: true
            });
        } else if (activeTab === 'INVENTORY') {
            setFormData({
                warehouseId: warehouses[0]?._id || '',
                productId: products[0]?._id || '',
                quantity: 100,
                reservedQuantity: 0,
                reorderLevel: 15
            });
        } else {
            setFormData({});
        }
        setModalOpen(true);
    };

    const openEditModal = (item: any) => {
        setEditItem(item);
        const tierId = item.tier?._id || item.tier || item.tierId || '';
        if (activeTab === 'INVENTORY') {
            setFormData({
                ...item,
                warehouseId: item.warehouseId?._id || item.warehouseId || '',
                productId: item.productId?._id || item.productId || '',
                quantity: item.quantity ?? 0,
                reservedQuantity: item.reservedQuantity ?? 0,
                reorderLevel: item.reorderLevel ?? 10
            });
        } else {
            setFormData({ ...item, tierId });
        }
        setModalOpen(true);
    };

    const handleDelete = async (endpoint: string, id: string) => {
        if (!window.confirm('Are you sure you want to delete this configuration item?')) return;
        try {
            await client.delete(`/config/${endpoint}/${id}`);
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to delete item');
        }
    };

    const handleSave = async (endpoint: string) => {
        try {
            if (editItem && editItem._id) {
                await client.put(`/config/${endpoint}/${editItem._id}`, formData);
            } else {
                await client.post(`/config/${endpoint}`, formData);
            }
            setModalOpen(false);
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to save configuration');
        }
    };

    // Filtered products for products tab
    const filteredProducts = products.filter(p =>
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Dynamic discount rules from backend state
    const displayRules = discountRules.map((r, idx) => ({
        id: r._id || idx,
        tier: r.customerTierId?.name || (r.maxDiscountPercent >= 25 ? 'Gold Account Tier' : r.maxDiscountPercent >= 15 ? 'Silver Account Tier' : 'Bronze Account Tier'),
        maxDiscount: `${r.maxDiscountPercent || 0}% Max`,
        managerEscalation: `Required if > ${r.approvalRequiredAbove || r.maxDiscountPercent || 0}%`,
        financeEscalation: `Required if > ${r.financeApprovalRequiredAbove || (r.maxDiscountPercent ? r.maxDiscountPercent + 10 : 25)}%`,
        status: r.isActive !== false ? 'ENFORCED' : 'INACTIVE'
    }));

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {isLoading && (
                <div className="p-8 text-center text-xs font-bold text-slate-500 bg-white rounded-3xl border border-slate-200">
                    Loading configuration data from server...
                </div>
            )}

            {/* VIEW 1: PRODUCTS MASTER CATALOG */}
            {activeTab === 'PRODUCTS' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Master Data
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {filteredProducts.length} Items Listed
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Product Master Catalog</h2>
                            <p className="text-xs text-slate-500 mt-1">Itemized hardware units, recurring licenses, list prices, and target margins.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Filter by product name or SKU..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 w-full sm:w-64 shadow-xs transition"
                            />
                            <button
                                onClick={openCreateModal}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap cursor-pointer"
                            >
                                + Add Product
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="pb-3">SKU</th>
                                    <th className="pb-3">Product Name</th>
                                    <th className="pb-3">Category</th>
                                    <th className="pb-3 text-right">Base List Price</th>
                                    <th className="pb-3 text-right">Cost Price</th>
                                    <th className="pb-3 text-right">Target Margin</th>
                                    <th className="pb-3 text-center">Type</th>
                                    <th className="pb-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map(p => {
                                    const base = p.basePrice || 0;
                                    const cost = p.costPrice || 0;
                                    const margin = base > 0 ? Math.round(((base - cost) / base) * 100) : 0;
                                    return (
                                        <tr key={p._id} className="hover:bg-slate-50/60 transition">
                                            <td className="py-3 font-mono font-bold text-blue-600">{p.sku || 'N/A'}</td>
                                            <td className="py-3 font-bold text-slate-900">{p.name}</td>
                                            <td className="py-3 text-slate-500">{p.categoryId?.name || 'Hardware'}</td>
                                            <td className="py-3 text-right font-black text-slate-900">${base.toLocaleString()}</td>
                                            <td className="py-3 text-right text-slate-500">${cost.toLocaleString()}</td>
                                            <td className="py-3 text-right">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${margin >= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {margin}%
                                                </span>
                                            </td>
                                            <td className="py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.isSubscription ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                                    {p.isSubscription ? 'SaaS' : 'Hardware'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right space-x-2">
                                                <button onClick={() => openEditModal(p)} className="text-blue-600 font-bold hover:underline">Edit</button>
                                                <button onClick={() => handleDelete('products', p._id)} className="text-red-600 font-bold hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW 2: PRICES & MULTIPLIERS */}
            {activeTab === 'PRICES' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Pricing Policy
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {discountRules.length} Automated Tiers Configured
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pricing Multipliers & Margin Rules</h2>
                            <p className="text-xs text-slate-500 mt-1">Automated tier price calculation benchmarks, discount allowances, and global floor margins.</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap cursor-pointer self-start sm:self-auto"
                        >
                            + Add Price Tier
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {discountRules.map((rule: any) => {
                            const name = rule.customerTierId?.name || 'Customer Tier';
                            const maxDisc = rule.maxDiscountPercent || 0;
                            const mult = (1 - maxDisc / 100).toFixed(2);
                            return (
                                <div key={rule._id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                            {name} Multiplier
                                        </span>
                                        <button onClick={() => openEditModal(rule)} className="text-blue-600 font-bold text-xs hover:underline cursor-pointer">
                                            Edit Multiplier
                                        </button>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">{mult}x</div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Standard baseline customer tier pricing policy dynamically configured in backend.
                                    </p>
                                    <div className="text-[11px] font-semibold text-slate-700 pt-2 border-t border-slate-200 flex items-center justify-between">
                                        <span>Max Discretionary Discount:</span>
                                        <span className="font-bold text-slate-900">{maxDisc}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                                Global CPQ Margin Compliance Guardrails
                            </div>
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active System Policy
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Management Review Threshold</div>
                                    <button onClick={() => openEditModal({ _id: 'guardrail-mgr', maxDiscountPercent: 15 })} className="text-blue-600 font-bold text-xs hover:underline cursor-pointer">
                                        Edit Floor
                                    </button>
                                </div>
                                <div className="text-2xl font-black text-slate-900">15.0% Margin Floor</div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">Quotations negotiated below this margin require explicit sign-off from Sales Manager and Finance before dispatch.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-red-700 uppercase tracking-wider">System Hard Block Floor</div>
                                    <button onClick={() => openEditModal({ _id: 'guardrail-block', maxDiscountPercent: 5 })} className="text-blue-600 font-bold text-xs hover:underline cursor-pointer">
                                        Edit Floor
                                    </button>
                                </div>
                                <div className="text-2xl font-black text-slate-900">5.0% Margin Floor</div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">Deals below this absolute floor cannot be submitted or dispatched under enterprise system governance.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 3: DISCOUNT RULES */}
            {activeTab === 'DISCOUNTS' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Governance Policy
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {discountRules.length} Tiers Configured
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Tier Discount Governance</h2>
                            <p className="text-xs text-slate-500 mt-1">Enforced threshold matrix defining maximum allowable rep discounts and escalation steps.</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap cursor-pointer self-start sm:self-auto"
                        >
                            + Add Tier Rule
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="pb-3">Customer Tier</th>
                                    <th className="pb-3">Max Allowed Discount</th>
                                    <th className="pb-3">Manager Escalation</th>
                                    <th className="pb-3">Finance Escalation</th>
                                    <th className="pb-3 text-center">Policy Status</th>
                                    <th className="pb-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {discountRules.map((rule) => {
                                    const tierName = rule.customerTierId?.name || 'Customer Tier';
                                    return (
                                        <tr key={rule._id} className="hover:bg-slate-50/60 transition">
                                            <td className="py-3.5 font-bold text-slate-900">{tierName}</td>
                                            <td className="py-3.5 font-bold text-emerald-700">{rule.maxDiscountPercent || 0}% Max</td>
                                            <td className="py-3.5 text-slate-600">Required if &gt; {rule.approvalRequiredAbove || rule.maxDiscountPercent || 0}%</td>
                                            <td className="py-3.5 text-slate-600">Required if &gt; {rule.financeApprovalRequiredAbove || (rule.maxDiscountPercent ? rule.maxDiscountPercent + 10 : 25)}%</td>
                                            <td className="py-3.5 text-center">
                                                <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                                    {rule.isActive !== false ? 'ENFORCED' : 'INACTIVE'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 text-right space-x-2">
                                                <button onClick={() => openEditModal(rule)} className="text-blue-600 font-bold hover:underline">Edit</button>
                                                <button onClick={() => handleDelete('discount-rules', rule._id)} className="text-red-600 font-bold hover:underline">Delete</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW: CUSTOMERS */}
            {activeTab === 'CUSTOMERS' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Accounts & Tiers
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {customers.length} Enterprise Accounts
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Master Accounts</h2>
                            <p className="text-xs text-slate-500 mt-1">Configured client accounts, assigned customer tier rules, and billing details.</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap cursor-pointer self-start sm:self-auto"
                        >
                            + Add Customer
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="pb-3">Account Name</th>
                                    <th className="pb-3">Email Address</th>
                                    <th className="pb-3">Assigned Tier</th>
                                    <th className="pb-3 text-center">Role</th>
                                    <th className="pb-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {customers.map((c: any) => (
                                    <tr key={c._id} className="hover:bg-slate-50/60 transition">
                                        <td className="py-3 font-bold text-slate-900">{c.name}</td>
                                        <td className="py-3 font-mono text-slate-600">{c.email}</td>
                                        <td className="py-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                {c.tier?.name || 'Gold Tier'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center font-mono font-bold text-slate-500">{c.role}</td>
                                        <td className="py-3 text-right space-x-2">
                                            <button onClick={() => openEditModal(c)} className="text-blue-600 font-bold hover:underline">Edit</button>
                                            <button onClick={() => handleDelete('customers', c._id)} className="text-red-600 font-bold hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW: APPROVAL CHAINS */}
            {activeTab === 'APPROVALS' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Governance Engine
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {approvalChain.length} Multi-Tier Escalation Steps
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Approval Chain Configuration</h2>
                            <p className="text-xs text-slate-500 mt-1">Configured discount threshold matrix for automated escalation routing.</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap cursor-pointer self-start sm:self-auto"
                        >
                            + Add Escalation Step
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {approvalChain.map((step: any, idx: number) => (
                            <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        Level {idx + 1} Approver
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-500">
                                        &gt; {step.threshold}% Discount
                                    </span>
                                </div>
                                <div className="font-bold text-base text-slate-900">{step.role}</div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Deals exceeding discount threshold automatically freeze and route to {step.role} queue before fulfillment.
                                </p>
                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-400">Escalation Rule</span>
                                    <button onClick={() => openEditModal(step)} className="text-blue-600 font-bold text-xs hover:underline cursor-pointer">
                                        Edit Threshold
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VIEW: WAREHOUSES */}
            {activeTab === 'WAREHOUSES' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Logistics Facilities
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {warehouses.length} Active Depots
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Regional Fulfillment Warehouses</h2>
                            <p className="text-xs text-slate-500 mt-1">Multi-warehouse inventory routing centers and stock reservation allocations direct in database.</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                        >
                            <span>+ Add Warehouse Depot</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {warehouses.map((w: any) => (
                            <div key={w._id || w.code} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3 relative hover:shadow-xs transition">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{w.code}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${w.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {w.isActive !== false ? 'Active Depot' : 'Inactive'}
                                    </span>
                                </div>
                                <div>
                                    <div className="font-bold text-base text-slate-900">{w.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{w.address || 'United States Headquarters'}</div>
                                </div>
                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span>Shipping Weight Priority:</span>
                                    <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{w.shippingCostWeight || 1}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                                    <button
                                        onClick={() => openEditModal(w)}
                                        className="text-blue-600 font-bold hover:underline cursor-pointer px-2 py-1"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete('warehouses', w._id)}
                                        className="text-red-600 font-bold hover:underline cursor-pointer px-2 py-1"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VIEW: INVENTORY */}
            {activeTab === 'INVENTORY' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Stock Management
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {inventory.length} Stock Records Live
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Inventory Allocations</h2>
                            <p className="text-xs text-slate-500 mt-1">Live stock availability, reserved units, and warehouse distribution priority direct from database.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                            {/* Warehouse Filter */}
                            <select
                                value={selectedWarehouseFilter}
                                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                                className="text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer"
                            >
                                <option value="ALL">All Warehouses ({warehouses.length})</option>
                                {warehouses.map((w: any) => (
                                    <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                ))}
                            </select>
                            <button
                                onClick={openCreateModal}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>+ Add / Adjust Stock</span>
                            </button>
                        </div>
                    </div>

                    {/* Stock Overview KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Warehouses</div>
                            <div className="text-2xl font-black text-slate-900 mt-0.5">{warehouses.length}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stock On Hand</div>
                            <div className="text-2xl font-black text-slate-900 mt-0.5">
                                {inventory
                                    .filter((s: any) => selectedWarehouseFilter === 'ALL' || s.warehouseId?._id === selectedWarehouseFilter || s.warehouseId === selectedWarehouseFilter)
                                    .reduce((acc: number, s: any) => acc + (s.quantity || 0), 0).toLocaleString()} Units
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Reserved Stock</div>
                            <div className="text-2xl font-black text-amber-600 mt-0.5">
                                {inventory
                                    .filter((s: any) => selectedWarehouseFilter === 'ALL' || s.warehouseId?._id === selectedWarehouseFilter || s.warehouseId === selectedWarehouseFilter)
                                    .reduce((acc: number, s: any) => acc + (s.reservedQuantity || 0), 0).toLocaleString()} Reserved
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Available for Orders</div>
                            <div className="text-2xl font-black text-emerald-600 mt-0.5">
                                {inventory
                                    .filter((s: any) => selectedWarehouseFilter === 'ALL' || s.warehouseId?._id === selectedWarehouseFilter || s.warehouseId === selectedWarehouseFilter)
                                    .reduce((acc: number, s: any) => acc + Math.max(0, (s.quantity || 0) - (s.reservedQuantity || 0)), 0).toLocaleString()} Units
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="pb-3">Product SKU</th>
                                    <th className="pb-3">Product Name</th>
                                    <th className="pb-3">Warehouse Depot</th>
                                    <th className="pb-3 text-right">On Hand Qty</th>
                                    <th className="pb-3 text-right">Reserved Units</th>
                                    <th className="pb-3 text-right">Net Available</th>
                                    <th className="pb-3 text-right">Reorder Level</th>
                                    <th className="pb-3 text-center">Status</th>
                                    <th className="pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventory
                                    .filter((s: any) => selectedWarehouseFilter === 'ALL' || s.warehouseId?._id === selectedWarehouseFilter || s.warehouseId === selectedWarehouseFilter)
                                    .map((s: any) => {
                                        const prodName = s.productId?.name || 'Unknown Product';
                                        const prodSku = s.productId?.sku || 'N/A';
                                        const whName = s.warehouseId?.name || 'Default Depot';
                                        const whCode = s.warehouseId?.code || 'MAIN';
                                        const available = Math.max(0, (s.quantity || 0) - (s.reservedQuantity || 0));
                                        const isLow = available <= (s.reorderLevel || 10) && available > 0;
                                        const isOut = available <= 0;

                                        return (
                                            <tr key={s._id} className="hover:bg-slate-50/60 transition">
                                                <td className="py-3 font-mono font-bold text-blue-600">{prodSku}</td>
                                                <td className="py-3 font-bold text-slate-900">{prodName}</td>
                                                <td className="py-3">
                                                    <span className="font-semibold text-slate-700">{whName}</span>
                                                    <span className="ml-1.5 font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{whCode}</span>
                                                </td>
                                                <td className="py-3 text-right font-mono font-bold text-slate-900">
                                                    {(s.quantity || 0).toLocaleString()}
                                                </td>
                                                <td className="py-3 text-right font-mono font-semibold text-amber-600">
                                                    {(s.reservedQuantity || 0).toLocaleString()}
                                                </td>
                                                <td className="py-3 text-right font-mono font-black text-emerald-700">
                                                    {available.toLocaleString()} Units
                                                </td>
                                                <td className="py-3 text-right font-mono text-slate-500">
                                                    {s.reorderLevel || 0}
                                                </td>
                                                <td className="py-3 text-center">
                                                    {isOut ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                            OUT OF STOCK
                                                        </span>
                                                    ) : isLow ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            LOW STOCK
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            IN STOCK
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(s)}
                                                        className="text-blue-600 font-bold hover:underline cursor-pointer"
                                                    >
                                                        Adjust
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete('inventory', s._id)}
                                                        className="text-red-500 font-bold hover:underline cursor-pointer"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW 5: SUBSCRIPTION PLANS */}
            {activeTab === 'PLANS' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                    Recurring Products
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {plans.length} Active SLA Tiers
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recurring Subscription Plans & SLAs</h2>
                            <p className="text-xs text-slate-500 mt-1">Recurring billing contract templates, billing intervals, and SLA uptime commitments.</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap cursor-pointer self-start sm:self-auto"
                        >
                            + Add Subscription Plan
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {plans.map((plan: any) => (
                            <div key={plan._id || plan.name} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase text-purple-700">{plan.billingCycle || 'MONTHLY'}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                        Recurring
                                    </span>
                                </div>
                                <div>
                                    <div className="font-bold text-base text-slate-900">{plan.name}</div>
                                    <div className="text-2xl font-black text-slate-900 mt-1">${(plan.price || 0).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60 flex items-center justify-between">
                                    <span>Proration: <strong className="text-slate-800">{plan.prorationEnabled ? 'Enabled' : 'Disabled'}</strong></span>
                                    <div className="space-x-2">
                                        <button onClick={() => openEditModal(plan)} className="text-blue-600 font-bold hover:underline">Edit</button>
                                        <button onClick={() => handleDelete('plans', plan._id)} className="text-red-600 font-bold hover:underline">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* UNIVERSAL CONFIGURATION EDIT/CREATE MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="text-xl font-black text-slate-900">
                                {editItem ? 'Edit Configuration' : 'Add New Configuration'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
                        </div>

                        {activeTab === 'PRODUCTS' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        placeholder="e.g. Enterprise Router X-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">SKU</label>
                                    <input
                                        type="text"
                                        value={formData.sku || ''}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                                        placeholder="e.g. HW-ROUTER-01"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Base Price ($)</label>
                                        <input
                                            type="number"
                                            value={formData.basePrice || ''}
                                            onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price ($)</label>
                                        <input
                                            type="number"
                                            value={formData.costPrice || ''}
                                            onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSave('products')}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    Save Product Config
                                </button>
                            </div>
                        )}

                        {activeTab === 'CUSTOMERS' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Account Name</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                                        placeholder="client@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Assign Customer Tier</label>
                                    <select
                                        value={formData.tierId || (discountRules[0]?.customerTierId?._id || '')}
                                        onChange={e => setFormData({ ...formData, tierId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                                    >
                                        <option value="">Select Tier (Gold, Silver, Bronze...)</option>
                                        {discountRules.map((rule: any) => {
                                            const tierObj = rule.customerTierId;
                                            if (!tierObj) return null;
                                            return (
                                                <option key={tierObj._id} value={tierObj._id}>
                                                    {tierObj.name} ({rule.maxDiscountPercent || 0}% Max Discount)
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <button
                                    onClick={() => handleSave('customers')}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    Save Customer Account & Tier
                                </button>
                            </div>
                        )}

                        {activeTab === 'APPROVALS' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Approver Role</label>
                                    <select
                                        value={formData.role || 'SALES_MANAGER'}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                                    >
                                        <option value="SALES_MANAGER">SALES_MANAGER</option>
                                        <option value="FINANCE">FINANCE</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Trigger Discount Threshold (&gt; %)</label>
                                    <input
                                        type="number"
                                        value={formData.threshold || ''}
                                        onChange={e => setFormData({ ...formData, threshold: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-bold"
                                        placeholder="e.g. 15"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        if (editItem) {
                                            setApprovalChain(prev => prev.map(s => s.role === editItem.role ? { ...s, threshold: formData.threshold || s.threshold, role: formData.role || s.role } : s));
                                        } else {
                                            setApprovalChain(prev => [...prev, { role: formData.role || 'SALES_MANAGER', threshold: formData.threshold || 20 }]);
                                        }
                                        setModalOpen(false);
                                    }}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    Save Escalation Rule
                                </button>
                            </div>
                        )}

                        {(activeTab === 'DISCOUNTS' || activeTab === 'PRICES') && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Max Allowed Discount (%)</label>
                                    <input
                                        type="number"
                                        value={formData.maxDiscountPercent || ''}
                                        onChange={e => setFormData({ ...formData, maxDiscountPercent: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Manager Approval Above (%)</label>
                                    <input
                                        type="number"
                                        value={formData.approvalRequiredAbove || ''}
                                        onChange={e => setFormData({ ...formData, approvalRequiredAbove: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Finance Approval Above (%)</label>
                                    <input
                                        type="number"
                                        value={formData.financeApprovalRequiredAbove || ''}
                                        onChange={e => setFormData({ ...formData, financeApprovalRequiredAbove: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={() => handleSave('discount-rules')}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    Save Discount Tier Rule
                                </button>
                            </div>
                        )}

                        {activeTab === 'WAREHOUSES' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Warehouse Code</label>
                                    <input
                                        type="text"
                                        value={formData.code || ''}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        disabled={!!editItem}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-mono disabled:bg-slate-100 uppercase"
                                        placeholder="WEST"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Facility Name</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        placeholder="West Coast Logistics Hub"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Location Address</label>
                                    <input
                                        type="text"
                                        value={formData.address || ''}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        placeholder="Los Angeles, CA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Shipping Cost Weight Priority</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={formData.shippingCostWeight ?? 1}
                                        onChange={e => setFormData({ ...formData, shippingCostWeight: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                                        placeholder="1.0"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="whActive"
                                        checked={formData.isActive !== false}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="whActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                                        Depot Active for Routing & Order Fulfillment
                                    </label>
                                </div>
                                <button
                                    onClick={() => handleSave('warehouses')}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    {editItem ? 'Update Warehouse Depot' : 'Save Warehouse Depot'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'INVENTORY' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Fulfillment Warehouse Depot</label>
                                    <select
                                        value={formData.warehouseId || ''}
                                        onChange={e => setFormData({ ...formData, warehouseId: e.target.value })}
                                        disabled={!!editItem}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-bold bg-white disabled:bg-slate-100"
                                    >
                                        <option value="">Select Warehouse</option>
                                        {warehouses.map((w: any) => (
                                            <option key={w._id} value={w._id}>
                                                {w.name} ({w.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Catalog Product</label>
                                    <select
                                        value={formData.productId || ''}
                                        onChange={e => setFormData({ ...formData, productId: e.target.value })}
                                        disabled={!!editItem}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-bold bg-white disabled:bg-slate-100"
                                    >
                                        <option value="">Select Product SKU</option>
                                        {products.map((p: any) => (
                                            <option key={p._id} value={p._id}>
                                                {p.sku} — {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">On Hand Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.quantity ?? ''}
                                            onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-mono font-bold"
                                            placeholder="100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Reserved Units</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.reservedQuantity ?? ''}
                                            onChange={e => setFormData({ ...formData, reservedQuantity: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Level</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.reorderLevel ?? ''}
                                            onChange={e => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                                            placeholder="15"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSave('inventory')}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    {editItem ? 'Update Stock Allocation' : 'Save Stock Allocation'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'PLANS' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Plan Name</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        placeholder="Pro SLA Plan"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Price ($)</label>
                                        <input
                                            type="number"
                                            value={formData.price || ''}
                                            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Billing Cycle</label>
                                        <select
                                            value={formData.billingCycle || 'MONTHLY'}
                                            onChange={e => setFormData({ ...formData, billingCycle: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-blue-500"
                                        >
                                            <option value="MONTHLY">MONTHLY</option>
                                            <option value="QUARTERLY">QUARTERLY</option>
                                            <option value="YEARLY">YEARLY</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSave('plans')}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    Save Subscription Plan
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
