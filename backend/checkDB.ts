import mongoose from 'mongoose';
import { QuotationLine } from './src/models/QuotationLine';
import { Product } from './src/models/Product';
import { connectDB } from './src/config/db';

async function check() {
    await connectDB();
    const lines = await QuotationLine.find();
    console.log("LINES:");
    for (const l of lines) {
        console.log(`${l.productName}: unitPrice=${l.unitPrice}`);
    }
    const products = await Product.find();
    console.log("PRODUCTS:");
    for (const p of products) {
        console.log(`${p.name}: basePrice=${p.basePrice}`);
    }
    process.exit(0);
}
check();
