import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../store/AuthContext';
import {
    Package, Truck, Warehouse as WarehouseIcon, CheckCircle2,
    Clock, AlertTriangle, ArrowRight, RefreshCw, Search,
    Filter, DollarSign, Receipt, ExternalLink, ShieldCheck, ChevronRight
} from 'lucide-react';

export default function FulfillmentScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isFinance = user?.role === 'FINANCE';

    const [orders, setOrders] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [plan, setPlan] = useState<any>(null);
    const [shipments, setShipments] = useState<any[]>([]);
    
    // View mode: 'ORDERS' or 'STOCK'
    const [viewMode, setViewMode] = useState<'ORDERS' | 'STOCK'>('ORDERS');

    // Filters
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'FULFILLED'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('ALL');
    const [stockSearch, setStockSearch] = useState('');

    // Manual Override State
    const [isEditing, setIsEditing] = useState(false);
    const [editableAllocations, setEditableAllocations] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusNote, setStatusNote] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [ordersRes, stocksRes, whRes] = await Promise.all([
                client.get('/orders'), // Fetch all orders to filter locally
                client.get('/orders/stocks'),
                client.get('/config/warehouses')
            ]);
            setOrders(ordersRes.data || []);
            setStocks(stocksRes.data || []);
            setWarehouses(whRes.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const processSplit = async (order: any) => {
        setIsProcessing(true);
        setStatusNote(null);
        setIsEditing(false);
        try {
            setSelectedOrder(order);
            if (order.status === 'PENDING_FULFILLMENT') {
                const planRes = await client.get(`/orders/${order._id}/split-plan`);
                setPlan(planRes.data);
                setShipments([]);
                setEditableAllocations(planRes.data.allocations || []);
            } else {
                // Fetch shipments and use the order's saved fulfillment plan
                const shipRes = await client.get(`/shipments/order/${order._id}`);
                setShipments(shipRes.data || []);
                setPlan({
                    allocations: order.fulfillmentPlan.filter((a: any) => !a.isBackorder),
                    backorders: order.fulfillmentPlan.filter((a: any) => a.isBackorder),
                    shipmentCount: order.shipmentCount
                });
            }
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.error || 'Failed to process split plan');
        } finally {
            setIsProcessing(false);
        }
    };

    const advanceShipment = async (shipmentId: string, currentStatus: string) => {
        const flow = ['READY_TO_SHIP', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED'];
        const nextIdx = flow.indexOf(currentStatus) + 1;
        if (nextIdx >= flow.length) return;
        
        const nextStatus = flow[nextIdx];
        try {
            await client.post(`/shipments/${shipmentId}/status`, { status: nextStatus });
            // Refresh shipments
            const shipRes = await client.get(`/shipments/order/${selectedOrder._id}`);
            setShipments(shipRes.data || []);
            fetchData(); // update background counts
        } catch (e) {
            console.error(e);
        }
    };

    const handleConsolidate = async () => {
        if (!selectedOrder) return;
        setIsProcessing(true);
        try {
            await client.post(`/orders/${selectedOrder._id}/consolidate-backorder`);
            setStatusNote('Backorder consolidated successfully! New shipments created.');
            const shipRes = await client.get(`/shipments/order/${selectedOrder._id}`);
            setShipments(shipRes.data || []);
            fetchData();
        } catch (e: any) {
            const msg = e.response?.data?.error?.message || e.response?.data?.error || e.message || 'Failed to consolidate backorder';
            alert(typeof msg === 'object' ? JSON.stringify(msg) : msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const acceptPlan = async () => {
        if (!selectedOrder) return;
        setIsProcessing(true);
        try {
            await client.post(`/orders/${selectedOrder._id}/accept-split`);
            setStatusNote('Fulfillment plan accepted and inventory reserved across warehouses!');
            setPlan(null);
            setSelectedOrder(null);
            fetchData();
        } catch (e: any) {
            const msg = e.response?.data?.error?.message || e.response?.data?.error || e.message || 'Failed to accept split plan';
            alert(typeof msg === 'object' ? JSON.stringify(msg) : msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const saveManualOverride = async () => {
        if (!selectedOrder) return;
        setIsProcessing(true);
        try {
            await client.post(`/orders/${selectedOrder._id}/manual-split`, {
                allocations: editableAllocations
            });
            setStatusNote('Manual split plan accepted and inventory reserved!');
            setIsEditing(false);
            setPlan(null);
            setSelectedOrder(null);
            fetchData();
        } catch (e: any) {
            const msg = e.response?.data?.error?.message || e.response?.data?.error || e.message || 'Failed to save manual split';
            alert(typeof msg === 'object' ? JSON.stringify(msg) : msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const cancelFulfillment = async () => {
        if (!selectedOrder) return;
        if (!window.confirm('Are you sure you want to reset this fulfillment plan? All shipments will be deleted and stock reservations released.')) return;
        
        setIsProcessing(true);
        try {
            await client.post(`/orders/${selectedOrder._id}/cancel-fulfillment`);
            setStatusNote('Fulfillment plan reset successfully.');
            setPlan(null);
            setSelectedOrder(null);
            fetchData();
        } catch (e: any) {
            const msg = e.response?.data?.error?.message || e.response?.data?.error || e.message || 'Failed to cancel fulfillment';
            alert(typeof msg === 'object' ? JSON.stringify(msg) : msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAllocationChange = (index: number, field: string, value: any) => {
        const newAllocations = [...editableAllocations];
        if (field === 'warehouseId') {
            const wh = warehouses.find(w => w._id === value);
            newAllocations[index].warehouseId = value;
            newAllocations[index].warehouseName = wh ? wh.name : 'Unknown';
        } else {
            newAllocations[index][field] = value;
        }
        setEditableAllocations(newAllocations);
    };

    // Derived Metrics
    const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === 'PENDING_FULFILLMENT').length, [orders]);
    const partialOrdersCount = useMemo(() => orders.filter(o => o.status === 'PARTIALLY_FULFILLED').length, [orders]);
    const fulfilledOrdersCount = useMemo(() => orders.filter(o => o.status === 'FULFILLED').length, [orders]);
    const totalUnitsAvailable = useMemo(() => stocks.reduce((acc, s) => acc + Math.max(0, (s.quantity || 0) - (s.reservedQuantity || 0)), 0), [stocks]);

    // Filtered Orders
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (activeTab === 'PENDING' && o.status !== 'PENDING_FULFILLMENT') return false;
            if (activeTab === 'PARTIAL' && o.status !== 'PARTIALLY_FULFILLED') return false;
            if (activeTab === 'FULFILLED' && o.status !== 'FULFILLED') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const orderMatch = (o.orderNumber || '').toLowerCase().includes(q);
                const custMatch = (o.customerId?.name || '').toLowerCase().includes(q);
                const statusMatch = (o.status || '').toLowerCase().includes(q);
                if (!orderMatch && !custMatch && !statusMatch) return false;
            }

            return true;
        });
    }, [orders, activeTab, searchQuery]);

    // Filtered Stocks
    const filteredStocks = useMemo(() => {
        return stocks.filter(s => {
            if (selectedWarehouseFilter !== 'ALL' && s.warehouseId?._id !== selectedWarehouseFilter) {
                return false;
            }
            if (stockSearch.trim()) {
                const q = stockSearch.toLowerCase();
                const prodMatch = (s.productId?.name || '').toLowerCase().includes(q);
                const skuMatch = (s.productId?.sku || '').toLowerCase().includes(q);
                const whMatch = (s.warehouseId?.name || '').toLowerCase().includes(q);
                if (!prodMatch && !skuMatch && !whMatch) return false;
            }
            return true;
        });
    }, [stocks, selectedWarehouseFilter, stockSearch]);

    // Status Badge Helper
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING_FULFILLMENT':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Routing
                    </span>
                );
            case 'PARTIALLY_FULFILLED':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-blue-600" />
                        Partial Backorder
                    </span>
                );
            case 'FULFILLED':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Fulfilled & Delivered
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/80">
                        Cancelled
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {status}
                    </span>
                );
        }
    };

    if (plan && selectedOrder) {
        const displayAllocations = isEditing ? editableAllocations : (plan.allocations || []);
        const hasDigitalOnly = displayAllocations.length === 0 && (!plan.backorders || plan.backorders.length === 0);

        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                onClick={() => { setPlan(null); setSelectedOrder(null); }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1"
                            >
                                ← Back to Fulfillment Queue
                            </button>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                Stock Allocation & Logistics
                            </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                Order {selectedOrder.orderNumber || 'SO-NEW'}
                            </h1>
                            {renderStatusBadge(selectedOrder.status)}
                        </div>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
                            Customer: <span className="font-bold text-slate-800">{selectedOrder.customerId?.name || 'Enterprise Customer'}</span> • Total Value: <span className="font-black text-slate-900">${Number(selectedOrder.grandTotal || 0).toLocaleString()}</span>
                        </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2.5">
                        {/* Direct Finance Link */}
                        <button
                            onClick={() => navigate(`/internal/billing/order/${selectedOrder._id}`)}
                            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <Receipt className="w-3.5 h-3.5 text-purple-600" />
                            <span>View Order Billing & Invoices</span>
                        </button>

                        {selectedOrder.status !== 'PENDING_FULFILLMENT' && (
                            <button
                                onClick={cancelFulfillment}
                                disabled={isProcessing}
                                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition cursor-pointer"
                            >
                                {isProcessing ? 'Resetting...' : 'Reset Fulfillment'}
                            </button>
                        )}
                        <button
                            onClick={() => { setPlan(null); setSelectedOrder(null); }}
                            className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                            {selectedOrder.status === 'PENDING_FULFILLMENT' ? 'Cancel Plan' : 'Close Details'}
                        </button>
                    </div>
                </div>

                {/* Digital / Cloud Orders Banner */}
                {hasDigitalOnly && (
                    <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200/80 rounded-3xl p-8 shadow-xs">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-900">
                                    Digital SaaS & Cloud Entitlement Order
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                                    This order contains electronic software licenses, cloud compute, or SaaS subscription tiers. Digital entitlements are provisioned instantly upon confirmation, with no physical freight, warehouse pick-pack, or courier dispatch required.
                                </p>
                                <div className="pt-2 flex items-center gap-3">
                                    <button
                                        onClick={() => navigate(`/internal/billing/order/${selectedOrder._id}`)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>Manage Recurring Billing Schedule</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warehouse Allocation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayAllocations?.map((a: any, i: number) => (
                        <div
                            key={i}
                            className={`bg-white border rounded-3xl p-6 shadow-xs flex flex-col justify-between ${isEditing ? 'border-blue-400 shadow-blue-100' : 'border-slate-200/90'}`}
                        >
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                    <div className="flex items-center gap-2 w-full pr-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                        {isEditing ? (
                                            <select 
                                                value={a.warehouseId || ''}
                                                onChange={(e) => handleAllocationChange(i, 'warehouseId', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                                            >
                                                {warehouses.map(w => (
                                                    <option key={w._id} value={w._id}>{w.name}</option>
                                                ))}
                                                <option value="">(Backorder)</option>
                                            </select>
                                        ) : (
                                            <h3 className="font-bold text-slate-900 text-sm">
                                                {a.warehouseName}
                                            </h3>
                                        )}
                                    </div>
                                    {!isEditing && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                            In Stock
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2.5 mb-6">
                                    {a.lines?.map((l: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between items-center bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 text-xs"
                                        >
                                            <span className="font-semibold text-slate-800">{l.productName}</span>
                                            <span className="font-black text-slate-900">Qty: {l.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                    Courier Shipping Cost
                                </span>
                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-500 font-bold">$</span>
                                        <input 
                                            type="number"
                                            value={a.shipmentCost}
                                            onChange={(e) => handleAllocationChange(i, 'shipmentCost', Number(e.target.value))}
                                            className="bg-slate-50 border border-slate-200 text-slate-900 font-black text-sm rounded-lg px-2 py-1 w-20 outline-none text-right focus:border-blue-500"
                                        />
                                    </div>
                                ) : (
                                    <span className="font-black text-slate-900 text-sm">
                                        ${Number(a.shipmentCost || 0).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Backorders Card (Only show strict backorders if not editing) */}
                    {!isEditing && plan.backorders && plan.backorders.length > 0 && plan.backorders.map((a: any, i: number) => (
                        <div
                            key={`bo-${i}`}
                            className="bg-red-50/60 border border-red-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-red-200/60 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                        <h3 className="font-bold text-red-900 text-sm">
                                            Backorder Allocation
                                        </h3>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                                        {a.status || 'Pending Restock'}
                                    </span>
                                </div>

                                <div className="space-y-2.5 mb-6">
                                    {a.lines?.map((l: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-200 text-xs"
                                        >
                                            <span className="font-semibold text-red-950">{l.productName}</span>
                                            <span className="font-black text-red-600">x{l.quantity} pending</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-red-200/60 flex flex-col gap-2">
                                {selectedOrder.status !== 'PENDING_FULFILLMENT' && (
                                    <button 
                                        onClick={handleConsolidate}
                                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                                    >
                                        Consolidate Available Stock
                                    </button>
                                )}
                                <span className="text-xs text-red-700 font-medium text-center">
                                    Split shipment will trigger once restocked.
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {selectedOrder.status === 'PENDING_FULFILLMENT' ? (
                    <div className="bg-white border border-blue-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <div>
                            <h4 className="text-slate-900 font-bold text-base">
                                Confirm Smart Fulfillment Routing
                            </h4>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Total Deliveries: <span className="font-bold text-slate-800">{isEditing ? editableAllocations.length : (plan.shipmentCount || 1)} Shipments</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        disabled={isProcessing}
                                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                    >
                                        Cancel Override
                                    </button>
                                    <button
                                        onClick={saveManualOverride}
                                        disabled={isProcessing}
                                        className="group-btn relative flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition overflow-hidden cursor-pointer"
                                    >
                                        <span>{isProcessing ? 'Saving...' : 'Save Override'}</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        disabled={isProcessing}
                                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                    >
                                        Manual Override
                                    </button>
                                    <button
                                        onClick={acceptPlan}
                                        disabled={isProcessing}
                                        className="group-btn relative flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition overflow-hidden cursor-pointer"
                                    >
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full btn-shimmer pointer-events-none" />
                                        <span>{isProcessing ? 'Reserving Inventory...' : 'Accept & Reserve Stock'}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
                        <h4 className="text-slate-900 font-bold text-lg mb-4">Active Shipments</h4>
                        {shipments.length === 0 ? (
                            <p className="text-sm text-slate-500">No active shipments.</p>
                        ) : (
                            <div className="space-y-4">
                                {shipments.map(sh => (
                                    <div key={sh._id} className="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-blue-600">{sh.shipmentNumber}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    sh.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    sh.status === 'READY_TO_SHIP' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                    {sh.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {sh.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ')}
                                            </p>
                                        </div>
                                        {sh.status !== 'DELIVERED' && (
                                            <button 
                                                onClick={() => advanceShipment(sh._id, sh.status)}
                                                className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition whitespace-nowrap"
                                            >
                                                Advance: {
                                                    sh.status === 'READY_TO_SHIP' ? 'Start Picking' :
                                                    sh.status === 'PICKING' ? 'Mark Packed' :
                                                    sh.status === 'PACKED' ? 'Mark Shipped' :
                                                    'Mark Delivered'
                                                }
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                            Logistics & Warehousing
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">
                            {isFinance ? 'Finance Order Review' : 'Fulfillment Operations'}
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Order Fulfillment & Logistics
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                        {isFinance
                            ? 'Monitor order dispatch milestones, split shipments, and track inventory for revenue recognition and invoicing.'
                            : 'Manage approved order dispatch, multi-warehouse split shipping, backorder isolation, and stock inventory.'
                        }
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {isFinance && (
                        <button
                            onClick={() => navigate('/internal/billing')}
                            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <Receipt className="w-3.5 h-3.5 text-purple-600" />
                            <span>Billing Dashboard</span>
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        title="Refresh fulfillment records"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {statusNote && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                    <span>{statusNote}</span>
                    <button onClick={() => setStatusNote(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-4 cursor-pointer">✕</button>
                </div>
            )}

            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Routing</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900">{pendingOrdersCount}</div>
                        <div className="text-[11px] font-medium text-amber-700 mt-0.5">Ready for split dispatch</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partial Backorders</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900">{partialOrdersCount}</div>
                        <div className="text-[11px] font-medium text-blue-700 mt-0.5">Split shipments active</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Deliveries</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900">{fulfilledOrdersCount}</div>
                        <div className="text-[11px] font-medium text-emerald-700 mt-0.5">100% stock delivered</div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Inventory</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                            <WarehouseIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalUnitsAvailable.toLocaleString()}</div>
                        <div className="text-[11px] font-medium text-purple-700 mt-0.5">Across {warehouses.length} warehouse hubs</div>
                    </div>
                </div>
            </div>

            {/* Segmented View Mode Switcher (Orders Queue vs Live Warehouse Stock) */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                    <button
                        onClick={() => setViewMode('ORDERS')}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                            viewMode === 'ORDERS'
                                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Package className="w-3.5 h-3.5" />
                        <span>Orders Queue ({orders.length})</span>
                    </button>
                    <button
                        onClick={() => setViewMode('STOCK')}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                            viewMode === 'STOCK'
                                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <WarehouseIcon className="w-3.5 h-3.5" />
                        <span>Live Warehouse Stock ({stocks.length})</span>
                    </button>
                </div>
            </div>

            {/* ========================================================= */}
            {/* VIEW 1: ORDERS QUEUE (Primary View)                      */}
            {/* ========================================================= */}
            {viewMode === 'ORDERS' && (
                <div className="space-y-4">
                    {/* Filter & Search Bar */}
                    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                            {[
                                { id: 'ALL', label: 'All Orders', count: orders.length },
                                { id: 'PENDING', label: 'Pending Routing', count: pendingOrdersCount },
                                { id: 'PARTIAL', label: 'Partial Backorder', count: partialOrdersCount },
                                { id: 'FULFILLED', label: 'Fulfilled', count: fulfilledOrdersCount },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id as any)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                                        activeTab === t.id
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {t.label} ({t.count})
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-72">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search order # or customer..."
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    {/* Orders List */}
                    {isLoading ? (
                        <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                            Loading orders queue...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <h3 className="text-base font-bold text-slate-800">No Matching Orders Found</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                                No orders match your current filter criteria. Check back once confirmed quotations generate sales orders.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {filteredOrders.map(o => (
                                <div
                                    key={o._id}
                                    className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center flex-wrap gap-2.5">
                                            <span className="text-xs font-black text-blue-600 tracking-wider font-mono">
                                                {o.orderNumber}
                                            </span>
                                            {renderStatusBadge(o.status)}
                                            {o.hasBackorder && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                    Split Warehouse Mode
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-base font-bold text-slate-900">
                                            {o.customerId?.name || 'Enterprise Customer'}
                                        </h3>

                                        <div className="text-xs text-slate-500 flex items-center flex-wrap gap-x-4 gap-y-1">
                                            <span>Value: <span className="font-bold text-slate-900">${Number(o.grandTotal || 0).toLocaleString()}</span></span>
                                            <span>• Lines: <span className="font-semibold text-slate-700">{(o.orderLines || []).length} items</span></span>
                                            {(o.status === 'FULFILLED' || o.status === 'PARTIALLY_FULFILLED') && (
                                                <span>• Logistics: <span className="font-semibold text-blue-600">{o.shipmentCount || 1} Shipments</span></span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center flex-wrap gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                        {/* Finance Invoicing / Billing Link */}
                                        <button
                                            onClick={() => navigate(`/internal/billing/order/${o._id}`)}
                                            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                                            title="View order billing and generated invoices"
                                        >
                                            <Receipt className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Order Billing</span>
                                        </button>

                                        {/* Fulfillment Split / Routing Details Button */}
                                        <button
                                            onClick={() => processSplit(o)}
                                            disabled={isProcessing}
                                            className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span>{o.status === 'PENDING_FULFILLMENT' ? 'Plan Order Split' : 'Routing Details'}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: LIVE WAREHOUSE STOCK                             */}
            {/* ========================================================= */}
            {viewMode === 'STOCK' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
                    {/* Header & Filter Controls */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Warehouse Stock Positions</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Live inventory counts, reserved allocations, and reorder alerts across all hubs</p>
                        </div>

                        <div className="flex items-center flex-wrap gap-2.5">
                            {/* Warehouse Dropdown */}
                            <select
                                value={selectedWarehouseFilter}
                                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 py-2 outline-none focus:border-blue-500"
                            >
                                <option value="ALL">All Warehouses ({warehouses.length})</option>
                                {warehouses.map(w => (
                                    <option key={w._id} value={w._id}>{w.name}</option>
                                ))}
                            </select>

                            {/* Stock Search */}
                            <div className="relative w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={stockSearch}
                                    onChange={(e) => setStockSearch(e.target.value)}
                                    placeholder="Search product or SKU..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stock Table */}
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto rounded-2xl border border-slate-200/80">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Warehouse</th>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3 text-center">Total Stock</th>
                                    <th className="px-4 py-3 text-center">Reserved</th>
                                    <th className="px-4 py-3 text-center">Available</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStocks.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                            No stock records match your search filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStocks.map(s => {
                                        const available = Math.max(0, s.quantity - s.reservedQuantity);
                                        const isLow = available <= (s.reorderLevel || 10);
                                        return (
                                            <tr key={s._id} className="hover:bg-slate-50/70 transition">
                                                <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                                                    {s.warehouseId?.name || 'Unknown'}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-700 max-w-xs truncate">
                                                    {s.productId?.name || 'Unknown Product'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 font-mono">
                                                    {s.productId?.sku || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium text-slate-700">
                                                    {s.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium text-slate-500">
                                                    {s.reservedQuantity}
                                                </td>
                                                <td className="px-4 py-3 text-center font-black text-slate-900">
                                                    {available}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {isLow ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            Reorder Soon
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Healthy Stock
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
