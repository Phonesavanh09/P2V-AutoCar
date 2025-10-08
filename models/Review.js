const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  name: String,
  message: String,
  rating: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', ReviewSchema);