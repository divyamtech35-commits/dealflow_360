import { Counter } from '../models/Counter';

export const getNextSequence = async (name: string, prefix: string): Promise<string> => {
    const result = await Counter.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const seqStr = result.seq.toString().padStart(4, '0');
    return `${prefix}-${seqStr}`;
};
