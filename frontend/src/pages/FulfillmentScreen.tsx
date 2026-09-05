import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function FulfillmentScreen() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [plan, setPlan] = useState<any>(null);
    const [shipments, setShipments] = useState<any[]>([]);
    
    // Manual Override State
    const [isEditing, setIsEditing] = useState(false);
    const [editableAllocations, setEditableAllocations] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState('Pending'); // Pending, Fulfilled, Cancelled

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

    if (plan && selectedOrder) {
        const displayAllocations = isEditing ? editableAllocations : plan.allocations;

        return (
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                onClick={() => { setPlan(null); setSelectedOrder(null); }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                                ← Back to Queue
                            </button>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                Stock Split & Routing
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Order {selectedOrder.orderNumber || 'SO-NEW'}
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Multi-warehouse stock allocation and courier optimization.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
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
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            {/* Header */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Logistics & Warehousing
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-500">
                            Fulfillment Center
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Fulfillment Queue
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
                        Approved orders ready for warehouse stock reservation, backorder isolation, and carrier dispatch.
                    </p>
                </div>
            </div>

            {statusNote && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                    <span>{statusNote}</span>
                    <button onClick={() => setStatusNote(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-4">✕</button>
                </div>
            )}

            {/* Live Stock Grid */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Live Warehouse Stock</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time inventory levels across all locations</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                                <th className="px-4 py-3 font-semibold rounded-tl-xl">Warehouse</th>
                                <th className="px-4 py-3 font-semibold">Product</th>
                                <th className="px-4 py-3 font-semibold text-center">In Stock</th>
                                <th className="px-4 py-3 font-semibold text-center">Reserved</th>
                                <th className="px-4 py-3 font-semibold text-center rounded-tr-xl">Available</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stocks.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">No stock data available</td>
                                </tr>
                            ) : (
                                stocks.map(s => {
                                    const available = s.quantity - s.reservedQuantity;
                                    return (
                                        <tr key={s._id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-4 py-3 font-medium text-slate-700">{s.warehouseId?.name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-slate-700">{s.productId?.name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-center text-slate-600">{s.quantity}</td>
                                            <td className="px-4 py-3 text-center text-slate-600">{s.reservedQuantity}</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-900">{available}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="flex items-center gap-2 mt-8 mb-4">
                {['Pending', 'Fulfilled', 'Cancelled'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                            activeTab === tab
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {tab} Orders
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading orders...</div>
            ) : (() => {
                const filteredOrders = orders.filter(o => {
                    if (activeTab === 'Pending') return o.status === 'PENDING_FULFILLMENT' || o.status === 'PARTIALLY_FULFILLED';
                    if (activeTab === 'Fulfilled') return o.status === 'FULFILLED';
                    if (activeTab === 'Cancelled') return o.status === 'CANCELLED';
                    return true;
                });

                if (filteredOrders.length === 0) {
                    return (
                        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <h3 className="text-base font-bold text-slate-800">No {activeTab} Orders</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                {activeTab === 'Pending' 
                                    ? 'Once quotations are confirmed by customers, the corresponding orders will appear here ready for warehouse routing.'
                                    : `There are currently no orders with a status of ${activeTab}.`
                                }
                            </p>
                        </div>
                    );
                }

                return (
                    <div className="space-y-4">
                        {filteredOrders.map(o => (
                            <div
                                key={o._id}
                                className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs font-bold text-blue-600 tracking-wider">
                                            {o.orderNumber}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                            o.status === 'FULFILLED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            o.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}>
                                            {o.status}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900">
                                        {o.customerId?.name || 'Enterprise Customer'}
                                    </h3>

                                    <div className="text-xs text-slate-400 flex items-center gap-4 mt-1">
                                        <span>Total: <span className="font-semibold text-slate-700">${Number(o.grandTotal || 0).toLocaleString()}</span></span>
                                        {(o.status === 'FULFILLED' || o.status === 'PARTIALLY_FULFILLED') && (
                                            <span>• Routing: <span className="font-semibold text-blue-600">{o.shipmentCount} Shipments</span></span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => processSplit(o)}
                                    disabled={isProcessing}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer self-stretch sm:self-auto text-center"
                                >
                                    {o.status === 'PENDING_FULFILLMENT' ? 'Plan Order Split →' : 'View Routing Details →'}
                                </button>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
}
