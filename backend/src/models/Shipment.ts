import mongoose, { Document, Schema } from 'mongoose';

export interface IShipmentItem {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
}

export interface IShipment extends Document {
    shipmentNumber: string;
    orderId: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;
    status: 'READY_TO_SHIP' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'DELIVERED';
    items: IShipmentItem[];
    createdAt: Date;
    updatedAt: Date;
}

const ShipmentItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true }
});

const ShipmentSchema = new Schema({
    shipmentNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: { 
        type: String, 
        enum: ['READY_TO_SHIP', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED'], 
        required: true, 
        default: 'READY_TO_SHIP' 
    },
    items: [ShipmentItemSchema]
}, { timestamps: true });

export const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
