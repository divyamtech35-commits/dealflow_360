import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicy extends Document {
    blendedWeight: number;
    worstWeight: number;
}

const PolicySchema: Schema = new Schema({
    blendedWeight: { type: Number, default: 0.6 },
    worstWeight: { type: Number, default: 0.4 }
});

export const Policy = mongoose.model<IPolicy>('Policy', PolicySchema);
