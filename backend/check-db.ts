import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Quotation } from './src/models/Quotation';
import { User } from './src/models/User';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealflow360');
    
    const quote = await Quotation.findOne({ quotationNumber: 'QT-0024' });
    console.log('QT-0024 customerId:', quote?.customerId);
    console.log('QT-0024 status:', quote?.status);

    const user = await User.findOne({ email: 'customer2@dealflow360.com' });
    console.log('customer2 _id:', user?._id);

    process.exit(0);
}

check();
