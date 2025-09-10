const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
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
    status: { type: String, default: 'available' },
    inspected: {
        noFlood: { type: Boolean, default: true },
        noMajorAccident: { type: Boolean, default: true },
        noFire: { type: Boolean, default: true }
    },
    isPremium: { type: Boolean, default: false },
    sellerName: String,
    sellerPhone: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Car', carSchema);