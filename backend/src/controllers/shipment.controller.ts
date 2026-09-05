import { Request, Response, NextFunction } from 'express';
import { Shipment } from '../models/Shipment';
import { Order } from '../models/Order';
import { activateOrderBilling } from './billing.controller';
import { logAudit } from '../services/auditService';

export const getOrderShipments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shipments = await Shipment.find({ orderId: req.params.orderId }).populate('warehouseId');
        res.json(shipments);
    } catch (e) {
        next(e);
    }
};

export const updateShipmentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.body;
        const shipment = await Shipment.findById(req.params.id);
        if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

        const validStatuses = ['READY_TO_SHIP', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const oldStatus = shipment.status;
        shipment.status = status;
        await shipment.save();

        const order = await Order.findById(shipment.orderId);
        if (order) {
            // Update the corresponding fulfillment plan entry if possible
            const fpEntry = order.fulfillmentPlan.find(
                (fp: any) => String(fp.warehouseId) === String(shipment.warehouseId) && fp.status !== 'DELIVERED'
            );
            if (fpEntry) {
                if (status === 'SHIPPED') {
                    fpEntry.status = 'SHIPPED';
                    fpEntry.shippedAt = new Date();
                } else if (status === 'DELIVERED') {
                    fpEntry.status = 'DELIVERED';
                }
            }

            // Check if all shipments are delivered
            const allShipments = await Shipment.find({ orderId: order._id });
            const allDelivered = allShipments.every(s => s.status === 'DELIVERED');

            if (allDelivered && !order.hasBackorder) {
                order.status = 'FULFILLED';
                order.actualDeliveryDate = new Date();
                await order.save();

                // Call billing trigger logic
                try {
                    // Mock req/res to reuse activateOrderBilling logic internally
                    const mockReq = { params: { id: order._id } } as unknown as Request;
                    const mockRes = {
                        status: () => ({ json: (data: any) => console.log('Billing Triggered:', data) }),
                        json: (data: any) => console.log('Billing Triggered:', data)
                    } as unknown as Response;
                    await activateOrderBilling(mockReq, mockRes, next);
                } catch (err) {
                    console.error('Failed to trigger billing', err);
                }
            } else {
                await order.save();
            }

            // Audit
            await logAudit({
                entityType: 'order',
                entityId: order._id as any,
                entityRef: order.orderNumber,
                action: 'shipment_status_changed',
                fromStatus: oldStatus,
                toStatus: status,
                actor: {
                    id: (req as any).user?._id?.toString() || 'SYSTEM',
                    name: (req as any).user?.name || 'Warehouse Operations',
                    role: (req as any).user?.role || 'OPS',
                    type: 'user'
                },
                metadata: {
                    shipmentNumber: shipment.shipmentNumber,
                    message: `Shipment ${shipment.shipmentNumber} moved to ${status}`
                }
            });
        }

        res.json(shipment);
    } catch (e) {
        next(e);
    }
};
