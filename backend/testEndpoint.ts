import mongoose from 'mongoose';
import { User } from './src/models/User';
import { Order } from './src/models/Order';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dealflow360');
  const user = await User.findOne({ role: 'finance' });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret123');

  const order = await Order.findOne({ orderNumber: 'SO-0615' });
  if(!order) { console.log("Order not found"); process.exit(1); }

  try {
    const res = await fetch(`http://localhost:5000/api/orders/${order._id}/cancel-fulfillment`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Status:", res.status);
    console.log("Data:", await res.json());
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
run();
