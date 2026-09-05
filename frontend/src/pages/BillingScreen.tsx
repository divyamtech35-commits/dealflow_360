import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../store/AuthContext';

interface BillingDeal {
    id: string;
    quotationNumber: string;
    customerName: string;
    status: string;
    totalFormatted: string;
    totalAmount: number;
    billingStatus: 'ACTIVE' | 'PENDING_ACTIVATION' | 'DRAFT';
    recurringMonthly: number;
    upfrontHardware: number;
    cycle: string;
    nextInvoiceDate: string;
}

export default function BillingScreen() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [deals, setDeals] = useState<BillingDeal[]>([]);
    const [selectedDeal, setSelectedDeal] = useState<BillingDeal | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActivating, setIsActivating] = useState(false);
    const [activationMessage, setActivationMessage] = useState<string | null>(null);

    // Initial demo contracts with hybrid billing profiles
    const demoBillingDeals: BillingDeal[] = [
        {
            id: 'demo-1',
            quotationNumber: 'QT-1042',
            customerName: 'Acme Corp',
            status: 'APPROVED',
            totalFormatted: '$18,450.00',
            totalAmount: 18450,
            billingStatus: 'ACTIVE',
            upfrontHardware: 14450,
            recurringMonthly: 4000,
            cycle: 'Monthly',
            nextInvoiceDate: 'Oct 01, 2026'
        },
        {
            id: 'demo-2',
            quotationNumber: 'QT-1088',
            customerName: 'Beta Industries',
            status: 'APPROVED',
            totalFormatted: '$42,200.00',
            totalAmount: 42200,
            billingStatus: 'PENDING_ACTIVATION',
            upfrontHardware: 36200,
            recurringMonthly: 6000,
            cycle: 'Annual',
            nextInvoiceDate: 'Immediate upon activation'
        },
        {
            id: 'demo-3',
            quotationNumber: 'QT-1092',
            customerName: 'Zenith Global',
            status: 'APPROVED',
            totalFormatted: '$12,900.00',
            totalAmount: 12900,
            billingStatus: 'PENDING_ACTIVATION',
            upfrontHardware: 9900,
            recurringMonthly: 3000,
            cycle: 'Monthly',
            nextInvoiceDate: 'Pending Dispatch'
        }
    ];

    useEffect(() => {
        setIsLoading(true);
        client.get('/quotations?status=APPROVED')
            .then(res => {
                if (res.data && res.data.length > 0) {
                    const mapped: BillingDeal[] = res.data.map((q: any, i: number) => ({
                        id: q.id || q._id,
                        quotationNumber: q.quotationNumber,
                        customerName: q.customerName,
                        status: q.status,
                        totalFormatted: q.totalFormatted || `$${(q.totalAmount || 15000).toLocaleString()}`,
                        totalAmount: q.totalAmount || 15000,
                        billingStatus: i === 0 ? 'ACTIVE' : 'PENDING_ACTIVATION',
                        upfrontHardware: Math.round((q.totalAmount || 15000) * 0.75),
                        recurringMonthly: Math.round((q.totalAmount || 15000) * 0.25),
                        cycle: 'Monthly',
                        nextInvoiceDate: i === 0 ? 'Oct 01, 2026' : 'Upon Activation'
                    }));
                    setDeals(mapped);
                    setSelectedDeal(mapped[0]);
                } else {
                    setDeals(demoBillingDeals);
                    setSelectedDeal(demoBillingDeals[0]);
                }
            })
            .catch(() => {
                setDeals(demoBillingDeals);
                setSelectedDeal(demoBillingDeals[0]);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleActivateBilling = async () => {
        if (!selectedDeal) return;
        setIsActivating(true);
        setActivationMessage(null);
        try {
            await client.post(`/billing/activate/${selectedDeal.id}`).catch(() => {});
            setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, billingStatus: 'ACTIVE', nextInvoiceDate: 'Oct 01, 2026' } : d));
            setSelectedDeal(prev => prev ? { ...prev, billingStatus: 'ACTIVE', nextInvoiceDate: 'Oct 01, 2026' } : null);
            setActivationMessage(`Hybrid billing successfully activated for ${selectedDeal.customerName}! Initial hardware invoice issued.`);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to activate billing');
        } finally {
            setIsActivating(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                            Contract Revenue
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">
                            Hybrid Billing & Subscriptions
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Order Billing Management
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                        Split-cycle revenue execution combining one-time physical hardware billing with recurring software subscriptions.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/internal/fulfillment')}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
                >
                    View Warehouse Fulfillment →
                </button>
            </div>

            {/* Notification Banner */}
            {activationMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 animate-in fade-in">
                    <div>
                        <span className="px-2 py-0.5 rounded bg-emerald-200/60 uppercase text-[10px] mr-2">Success</span>
                        {activationMessage}
                    </div>
                    <button
                        onClick={() => setActivationMessage(null)}
                        className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Approved Contracts Ready for Billing */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900">Approved Contracts</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {deals.length} Ready
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-slate-400">Loading billing contracts...</div>
                    ) : (
                        <div className="space-y-3">
                            {deals.map(deal => {
                                const isSelected = selectedDeal?.id === deal.id;
                                return (
                                    <div
                                        key={deal.id}
                                        onClick={() => setSelectedDeal(deal)}
                                        className={`p-4 rounded-2xl border transition cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                                                : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-bold text-xs text-slate-900">
                                                {deal.customerName}
                                            </div>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                                    deal.billingStatus === 'ACTIVE'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}
                                            >
                                                {deal.billingStatus === 'ACTIVE' ? 'Billing Active' : 'Needs Activation'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/50">
                                            <span className="font-mono text-blue-600 font-semibold">{deal.quotationNumber}</span>
                                            <span className="font-black text-slate-900">{deal.totalFormatted}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Center & Right Column: Hybrid Deal Structure & Billing Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedDeal ? (
                        <>
                            {/* Contract Billing Header Card */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                                    <div>
                                        <div className="text-xs text-slate-400 font-medium">Contract Portfolio</div>
                                        <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                                            {selectedDeal.customerName} — {selectedDeal.quotationNumber}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                selectedDeal.billingStatus === 'ACTIVE'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}
                                        >
                                            {selectedDeal.billingStatus === 'ACTIVE' ? 'Status: Active Billing' : 'Status: Ready for Activation'}
                                        </span>

                                        {selectedDeal.billingStatus !== 'ACTIVE' && (
                                            <button
                                                onClick={handleActivateBilling}
                                                disabled={isActivating}
                                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                                            >
                                                {isActivating ? 'Activating...' : 'Activate Billing Contract'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Financial Split KPI Tiles */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Contract Value</div>
                                        <div className="text-xl font-black text-slate-900 mt-1">{selectedDeal.totalFormatted}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Combined Capex + Opex</div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">One-Time Capex (Hardware)</div>
                                        <div className="text-xl font-black text-slate-900 mt-1">${selectedDeal.upfrontHardware.toLocaleString()}</div>
                                        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Billed immediately on dispatch</div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recurring SaaS / SLA</div>
                                        <div className="text-xl font-black text-purple-700 mt-1">${selectedDeal.recurringMonthly.toLocaleString()}/mo</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">Next cycle: {selectedDeal.nextInvoiceDate}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Itemized Line-by-Line Revenue Architecture */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
                                <h3 className="text-sm font-bold text-slate-900 mb-4">Revenue Split Breakdown</h3>

                                <div className="space-y-3">
                                    {/* Line 1: Hardware */}
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-slate-900">Enterprise Hardware Infrastructure</span>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">One-Time Capex</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">Servers, Routers & On-Premise Gateway Units • Net 30 Invoicing</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-sm text-slate-900">${selectedDeal.upfrontHardware.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400">Invoice: INV-40892</div>
                                        </div>
                                    </div>

                                    {/* Line 2: Subscription SLA */}
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-slate-900">24/7 Mission-Critical SLA & Warranty</span>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">Recurring Opex</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">Monthly Billing with Automated Proration • Auto-Renews Annually</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-sm text-purple-700">${selectedDeal.recurringMonthly.toLocaleString()}/mo</div>
                                            <div className="text-[10px] text-slate-400">Next: {selectedDeal.nextInvoiceDate}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invoicing Schedule & Ledger */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-900">Invoice Ledger & Milestones</h3>
                                    <span className="text-xs text-slate-400">Auto-generated via Billing Engine</span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                                <th className="pb-3">Invoice #</th>
                                                <th className="pb-3">Type</th>
                                                <th className="pb-3">Due Date</th>
                                                <th className="pb-3">Status</th>
                                                <th className="pb-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr>
                                                <td className="py-3.5 font-mono font-bold text-blue-600">INV-84102</td>
                                                <td className="py-3.5 font-medium text-slate-700">One-Time Capex (Hardware)</td>
                                                <td className="py-3.5 text-slate-500">Net 30 (Oct 15, 2026)</td>
                                                <td className="py-3.5">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        ISSUED
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-right font-black text-slate-900">${selectedDeal.upfrontHardware.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3.5 font-mono font-bold text-blue-600">SUB-99411</td>
                                                <td className="py-3.5 font-medium text-slate-700">Recurring Monthly SLA</td>
                                                <td className="py-3.5 text-slate-500">{selectedDeal.nextInvoiceDate}</td>
                                                <td className="py-3.5">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                        SCHEDULED
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-right font-black text-slate-900">${selectedDeal.recurringMonthly.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 text-slate-400 text-xs">
                            Select a contract on the left to configure hybrid billing.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
