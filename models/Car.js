const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: String,
  year: Number,
  price: Number,
  mileage: String,
  fuel: String,
  transmission: String,
  color: String,
  images: [String],
  status: { type: String, enum: ['ขายแล้ว','โปรโมชั่น','รถมาใหม่'], default: 'รถมาใหม่' },
  dateAdded: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Car', CarSchema);