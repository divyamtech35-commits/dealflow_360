const mongoose = require('mongoose');

async function test() {
    await mongoose.connect('mongodb://localhost:27017/dealflow360');
    console.log('Connected to DB');

    const Quotation = mongoose.connection.collection('quotations');
    const q = await Quotation.findOne({ quotationNumber: 'QT-0024' });

    const NegotiationModel = mongoose.model('Negotiation', new mongoose.Schema({
        quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, index: true },
        status: { type: String, enum: ['OPEN', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'RESOLVED'], required: true, default: 'OPEN' },
        actorType: { type: String, enum: ['CUSTOMER', 'REP'], required: true },
    }));

    const result = await NegotiationModel.updateMany(
        { quotationId: q._id.toString(), status: 'OPEN', actorType: 'CUSTOMER' },
        { status: 'RESOLVED' }
    );
    console.log('Update Result with toString:', result);

    const result2 = await NegotiationModel.updateMany(
        { quotationId: q._id, status: 'OPEN', actorType: 'CUSTOMER' },
        { $set: { status: 'RESOLVED' } }
    );
    console.log('Update Result with ObjectId:', result2);

    process.exit(0);
}
test();
