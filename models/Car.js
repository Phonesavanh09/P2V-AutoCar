const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    price: { type: Number, required: true },
    transmission: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String },
    province: { type: String, required: true }, // เพิ่มจังหวัด
    coverImage: { type: String } // เพิ่มภาพหน้าปก
});

module.exports = mongoose.model('Car', carSchema);