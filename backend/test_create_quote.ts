import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { createQuotation } from './src/controllers/quotation.controller';
import { User, UserRole } from './src/models/User';
import dotenv from 'dotenv';
import './src/models/CustomerTier';

dotenv.config();

const run = async () => {
    await mongoose.connect('mongodb://localhost:27017/dealflow360');
    console.log('connected');

    let u = await User.findOne({ role: UserRole.SALES_REP });
    if (!u) {
        u = await User.create({
            name: 'Test Rep',
            email: 'testrep' + Date.now() + '@test.com',
            passwordHash: 'xx',
            role: UserRole.SALES_REP
        });
    }

    let customer = await User.findOne({ role: UserRole.CUSTOMER });
    if (!customer) {
        customer = await User.create({
            name: 'Test Customer',
            email: 'cust' + Date.now() + '@test.com',
            passwordHash: 'xx',
            role: UserRole.CUSTOMER
        });
    }

    const req: Partial<Request> = {
        body: { customerId: customer._id },
        user: u
    };

    const res: Partial<Response> = {
        status: (code: number) => {
            console.log('STATUS:', code);
            return res as Response;
        },
        json: (data: any) => {
            console.log('JSON:', data);
        }
    };

    const next: NextFunction = (err?: any) => {
        console.error('NEXT CALLED WITH ERROR:', err);
    };

    console.log('calling create...');
    await createQuotation(req as Request, res as Response, next);

    await mongoose.disconnect();
};

run().catch(console.error);
