import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderLine {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
    isSubscription: boolean;
}

export interface IFulfillmentLine {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
}

export interface IFulfillmentPlan {
    warehouseId: mongoose.Types.ObjectId | null;
    warehouseName: string;
    lines: IFulfillmentLine[];
    shipmentCost: number;
    isBackorder: boolean;
    status: 'PLANNED' | 'RESERVED' | 'SHIPPED' | 'DELIVERED';
    expectedDate?: Date;
    shippedAt?: Date;
}

export interface IOrder extends Document {
    orderNumber: string;
    quotationId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    salesRepId: mongoose.Types.ObjectId;
    status: 'PENDING_FULFILLMENT' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';
    orderLines: IOrderLine[];
    fulfillmentPlan: IFulfillmentPlan[];
    splitMode: 'AUTO' | 'MANUAL';
    hasBackorder: boolean;
    shipmentCount: number;
    totalShippingCost: number;
    grandTotal: number;
    promisedDeliveryDate?: Date;
    actualDeliveryDate?: Date;
    stockReservedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FulfillmentLineSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true }
});

const OrderLineSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
    isSubscription: { type: Boolean, default: false }
});

const FulfillmentPlanSchema = new Schema({
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    warehouseName: { type: String },
    lines: [FulfillmentLineSchema],
    shipmentCost: { type: Number, required: true, default: 0 },
    isBackorder: { type: Boolean, required: true, default: false },
    status: { type: String, enum: ['PLANNED', 'RESERVED', 'SHIPPED', 'DELIVERED'], required: true, default: 'PLANNED' },
    expectedDate: { type: Date },
    shippedAt: { type: Date }
});

const OrderSchema = new Schema({
    orderNumber: { type: String, required: true, unique: true },
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    salesRepId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['PENDING_FULFILLMENT', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'], required: true, default: 'PENDING_FULFILLMENT' },
    orderLines: [OrderLineSchema],
    fulfillmentPlan: [FulfillmentPlanSchema],
    splitMode: { type: String, enum: ['AUTO', 'MANUAL'], required: true, default: 'AUTO' },
    hasBackorder: { type: Boolean, required: true, default: false, index: true },
    shipmentCount: { type: Number, required: true, default: 0 },
    totalShippingCost: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true },
    promisedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    stockReservedAt: { type: Date }
}, { timestamps: true });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
