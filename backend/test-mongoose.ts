import mongoose from 'mongoose';
import { Negotiation } from './src/models/Negotiation';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/dealflow360');
    
    try {
        const neg = await Negotiation.create({
            quotationId: new mongoose.Types.ObjectId("6a9c6274b645e8fef3a0b72e"),
            type: 'COMMENT',
            actorType: 'REP',
            message: 'Ok I will try',
            status: 'RESOLVED'
        });
        console.log('Inserted via Mongoose');
    } catch(e) {
        console.error('Mongoose Insert error:', e.message);
    }
    
    mongoose.disconnect();
}
check();
