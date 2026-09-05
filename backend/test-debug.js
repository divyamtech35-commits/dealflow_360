const mongoose = require('mongoose');

async function debug() {
    await mongoose.connect('mongodb://localhost:27017/dealflow360');
    console.log('Connected to DB');

    const Quotation = mongoose.connection.collection('quotations');
    const q = await Quotation.findOne({ quotationNumber: 'QT-0024' });
    if (!q) {
        console.log('QT-0024 not found');
        process.exit(0);
    }
    console.log('Found QT-0024:', q._id);

    const Negotiation = mongoose.connection.collection('negotiations');
    const negs = await Negotiation.find({ quotationId: q._id }).toArray();
    console.log('Negotiations:', negs);
    
    const openCustomer = negs.filter(n => n.status === 'OPEN' && n.actorType === 'CUSTOMER');
    console.log('Open Customer Counters:', openCustomer.length);

    const Order = mongoose.connection.collection('orders');
    const order = await Order.findOne({ quotationId: q._id });
    console.log('Order exists:', !!order);
    
    process.exit(0);
}
debug();
