const mongoose = require('mongoose');
const { Shipment } = require('./src/models/Shipment');
const { Order } = require('./src/models/Order');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const order = await Order.findOne({ orderNumber: 'SO-0615' });
  if (!order) return console.log('Order not found');
  
  const shipments = await Shipment.find({ orderId: order._id }).sort({ createdAt: 1 });
  console.log('Total shipments found:', shipments.length);
  
  if (shipments.length > 1) {
    // Keep the first one, delete the rest
    const toDelete = shipments.slice(1).map(s => s._id);
    await Shipment.deleteMany({ _id: { $in: toDelete } });
    console.log('Deleted duplicate shipments:', toDelete.length);
    
    // Also fix the order shipmentCount just in case
    order.shipmentCount = 1;
    await order.save();
  }
  
  process.exit(0);
}
run().catch(console.error);
