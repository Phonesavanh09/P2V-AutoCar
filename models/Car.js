const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    price: { type: Number, required: true },
    transmission: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String },
    province: { type: String, required: true },
    coverImage: { type: String },
    postedDate: { type: Date, default: Date.now }, // เพิ่มวันที่โพสต์
    status: { type: String, default: 'available' } // เพิ่มสถานะ (available, sold)
});

module.exports = mongoose.model('Car', carSchema);