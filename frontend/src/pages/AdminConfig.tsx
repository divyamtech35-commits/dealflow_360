import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../store/AuthContext';

interface AdminConfigProps {
    tab?: 'PRODUCTS' | 'PRICES' | 'DISCOUNTS' | 'WAREHOUSES' | 'PLANS';
}

export default function AdminConfig({ tab }: AdminConfigProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'PRICES' | 'DISCOUNTS' | 'WAREHOUSES' | 'PLANS'>(tab || 'PRODUCTS');

    useEffect(() => {
        if (tab) {
            setActiveTab(tab);
        }
    }, [tab]);

    const handleTabChange = (newTab: 'PRODUCTS' | 'PRICES' | 'DISCOUNTS' | 'WAREHOUSES' | 'PLANS') => {
        setActiveTab(newTab);
        const routeMap: Record<string, string> = {
            PRODUCTS: '/internal/admin/products',
            PRICES: '/internal/admin/prices',
            DISCOUNTS: '/internal/admin/discount-rules',
            WAREHOUSES: '/internal/admin/warehouses',
            PLANS: '/internal/admin/subscription-plans',
        };
        navigate(routeMap[newTab] || '/internal/admin/products');
    };

    const [products, setProducts] = useState<any[]>([]);
    const [discountRules, setDiscountRules] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            client.get('/config/products').catch(() => ({ data: [] })),
            client.get('/config/discount-rules').catch(() => ({ data: [] })),
            client.get('/config/warehouses').catch(() => ({ data: [] })),
            client.get('/config/plans').catch(() => ({ data: [] }))
        ]).then(([prodRes, discRes, wareRes, planRes]) => {
            setProducts(prodRes.data || []);
            setDiscountRules(discRes.data || []);
            setWarehouses(wareRes.data || []);
            setPlans(planRes.data || []);
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    // Filtered products for products tab
    const filteredProducts = products.filter(p =>
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Dynamic discount rules from backend state
    const displayRules = discountRules.length > 0 ? discountRules.map((r, idx) => ({
        id: r._id || idx,
        tier: r.customerTierId?.name || (r.maxDiscountPercent >= 25 ? 'Gold Account Tier' : r.maxDiscountPercent >= 15 ? 'Silver Account Tier' : 'Bronze Account Tier'),
        maxDiscount: `${r.maxDiscountPercent || 0}% Max`,
        managerEscalation: `Required if > ${r.approvalRequiredAbove || r.maxDiscountPercent || 0}%`,
        financeEscalation: `Required if > ${r.financeApprovalRequiredAbove || (r.maxDiscountPercent ? r.maxDiscountPercent + 10 : 25)}%`,
        status: r.isActive !== false ? 'ENFORCED' : 'INACTIVE'
    })) : [
        { id: 1, tier: 'Gold Account Tier', maxDiscount: '25.0% Max', managerEscalation: 'Required if > 25%', financeEscalation: 'Required if > 35%', status: 'ENFORCED' },
        { id: 2, tier: 'Silver Account Tier', maxDiscount: '15.0% Max', managerEscalation: 'Required if > 15%', financeEscalation: 'Required if > 25%', status: 'ENFORCED' },
        { id: 3, tier: 'Bronze Account Tier', maxDiscount: '8.0% Max', managerEscalation: 'Required if > 8%', financeEscalation: 'Required if > 18%', status: 'ENFORCED' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Top Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                {[
                    { id: 'PRODUCTS', label: 'Products' },
                    { id: 'PRICES', label: 'Price Lists' },
                    { id: 'DISCOUNTS', label: 'Discount Tiers' },
                    { id: 'WAREHOUSES', label: 'Warehouses' },
                    { id: 'PLANS', label: 'Subscription Plans' },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => handleTabChange(t.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === t.id
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

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
                        <input
                            type="text"
                            placeholder="Filter by product name or SKU..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 w-full sm:w-80 shadow-xs transition"
                        />
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
                    <div className="pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Pricing Policy
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-500">
                                3 Automated Tiers
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pricing Multipliers & Margin Rules</h2>
                        <p className="text-xs text-slate-500 mt-1">Automated tier price calculation benchmarks, discount allowances, and global floor margins.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-2">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                Gold Tier Multiplier
                            </span>
                            <div className="text-3xl font-black text-slate-900">0.80x</div>
                            <p className="text-xs text-slate-500">
                                Standard 20% baseline customer discount multiplier automatically applied to all catalog lines.
                            </p>
                            <div className="text-[11px] font-semibold text-amber-700 pt-2 border-t border-amber-100">
                                Max Discretionary Discount: 25%
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-800 border border-slate-300">
                                Silver Tier Multiplier
                            </span>
                            <div className="text-3xl font-black text-slate-900">0.90x</div>
                            <p className="text-xs text-slate-500">
                                Standard 10% baseline customer discount multiplier for mid-market recurring accounts.
                            </p>
                            <div className="text-[11px] font-semibold text-slate-700 pt-2 border-t border-slate-200">
                                Max Discretionary Discount: 15%
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl border border-orange-200 bg-orange-50/30 space-y-2">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-800 border border-orange-200">
                                Bronze Tier Multiplier
                            </span>
                            <div className="text-3xl font-black text-slate-900">1.00x</div>
                            <p className="text-xs text-slate-500">
                                Standard list MSRP base price book for standard enterprise client accounts.
                            </p>
                            <div className="text-[11px] font-semibold text-orange-800 pt-2 border-t border-orange-100">
                                Max Discretionary Discount: 8%
                            </div>
                        </div>
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
                            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-xs">
                                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Management Review Threshold</div>
                                <div className="text-2xl font-black text-slate-900">15.0% Margin Floor</div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">Quotations negotiated below this margin require explicit sign-off from Sales Manager and Finance before dispatch.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1 shadow-xs">
                                <div className="text-xs font-bold text-red-700 uppercase tracking-wider">System Hard Block Floor</div>
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
                    <div className="pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Governance Policy
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-500">
                                {displayRules.length} Tiers Configured
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Tier Discount Governance</h2>
                        <p className="text-xs text-slate-500 mt-1">Enforced threshold matrix defining maximum allowable rep discounts and escalation steps.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="pb-3">Customer Tier</th>
                                    <th className="pb-3">Max Allowed Discount</th>
                                    <th className="pb-3">Manager Escalation</th>
                                    <th className="pb-3">Finance Escalation</th>
                                    <th className="pb-3 text-right">Policy Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayRules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-slate-50/60 transition">
                                        <td className="py-3.5 font-bold text-slate-900">{rule.tier}</td>
                                        <td className="py-3.5 font-bold text-emerald-700">{rule.maxDiscount}</td>
                                        <td className="py-3.5 text-slate-600">{rule.managerEscalation}</td>
                                        <td className="py-3.5 text-slate-600">{rule.financeEscalation}</td>
                                        <td className="py-3.5 text-right">
                                            <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                                {rule.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW 4: WAREHOUSES */}
            {activeTab === 'WAREHOUSES' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Logistics Facilities
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-500">
                                {warehouses.length || 3} Active Depots
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Regional Fulfillment Warehouses</h2>
                        <p className="text-xs text-slate-500 mt-1">Multi-warehouse inventory routing centers and stock reservation allocations.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {(warehouses.length > 0 ? warehouses : [
                            { code: 'WH-MAIN', name: 'Main Headquarters Logistics', location: 'Austin, TX', capacity: '150,000 Units', priority: 1 },
                            { code: 'WH-EAST', name: 'East Coast Distribution Depot', location: 'New York, NY', capacity: '95,000 Units', priority: 2 },
                            { code: 'WH-WEST', name: 'West Coast Logistics Center', location: 'San Francisco, CA', capacity: '120,000 Units', priority: 3 }
                        ]).map((w: any) => (
                            <div key={w.code || w._id} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-bold text-blue-600">{w.code}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Active Depot
                                    </span>
                                </div>
                                <div className="font-bold text-sm text-slate-900">{w.name}</div>
                                <div className="text-xs text-slate-500">{w.location || w.address?.city || 'United States'}</div>
                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span>Capacity:</span>
                                    <span>{w.capacity || '100,000 Units'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VIEW 5: SUBSCRIPTION PLANS */}
            {activeTab === 'PLANS' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
                    <div className="pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Recurring Products
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-500">
                                {plans.length || 3} Active SLA Tiers
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recurring Subscription Plans & SLAs</h2>
                        <p className="text-xs text-slate-500 mt-1">Recurring billing contract templates, billing intervals, and SLA uptime commitments.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {(plans.length > 0 ? plans : [
                            { name: 'Standard SaaS License', frequency: 'Monthly', fee: '$250/mo', sla: '99.5% Uptime' },
                            { name: 'Pro Enterprise SLA Warranty', frequency: 'Monthly', fee: '$600/mo', sla: '99.9% Uptime' },
                            { name: 'Mission-Critical VIP Coverage', frequency: 'Annual', fee: '$6,000/yr', sla: '99.99% Uptime' }
                        ]).map((plan: any, i: number) => (
                            <div key={i} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase text-purple-700">{plan.frequency || 'Monthly'}</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                        Recurring
                                    </span>
                                </div>
                                <div>
                                    <div className="font-bold text-base text-slate-900">{plan.name}</div>
                                    <div className="text-2xl font-black text-slate-900 mt-1">{plan.fee || `$${plan.basePrice || 250}/mo`}</div>
                                </div>
                                <div className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                                    SLA Target: <span className="font-bold text-slate-800">{plan.sla || '99.9% Uptime'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
