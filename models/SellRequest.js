const mongoose = require('mongoose');

const sellRequestSchema = new mongoose.Schema({
    sellerName: String,
    phone: String,
    brand: String,
    model: String,
    year: Number,
    price: Number,
    transmission: String,
    mileage: Number,
    images: [String],
    description: String,
    province: String,
    coverImage: String,
    inspected: {
        noFlood: Boolean,
        noMajorAccident: Boolean,
        noFire: Boolean
    },
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SellRequest', sellRequestSchema);