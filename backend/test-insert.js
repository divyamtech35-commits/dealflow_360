const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/dealflow360');
    
    // We can simulate the controller using actual mock request/response if we want
    // But let's just see if Negotiation.create fails
    const db = mongoose.connection;
    const Negotiation = db.collection('negotiations');
    
    try {
        await Negotiation.insertOne({
            quotationId: new mongoose.Types.ObjectId("6a9c6274b645e8fef3a0b72e"),
            type: 'COMMENT',
            actorType: 'REP',
            message: 'Ok I will try',
            status: 'RESOLVED',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('Inserted');
    } catch(e) {
        console.error('Insert error:', e);
    }
    
    mongoose.disconnect();
}
check();
