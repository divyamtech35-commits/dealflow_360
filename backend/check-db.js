const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/dealflow360');
    
    // We cannot easily require TS files directly without ts-node/Babel, so we'll query raw collection
    const db = mongoose.connection.db;
    
    const quote = await db.collection('quotations').findOne({ quotationNumber: 'QT-0024' });
    console.log('QT-0024 customerId:', quote?.customerId);
    console.log('QT-0024 status:', quote?.status);

    const user = await db.collection('users').findOne({ email: 'customer2@dealflow360.com' });
    console.log('customer2 _id:', user?._id);

    process.exit(0);
}

check();
