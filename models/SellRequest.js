const mongoose = require('mongoose');

const sellRequestSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    price: { type: Number, required: true },
    transmission: { type: String, required: true },
    contact: { type: String, required: true },
    images: [{ type: String }],
    province: { type: String, required: true } // เพิ่มจังหวัด
});

module.exports = mongoose.model('SellRequest', sellRequestSchema);