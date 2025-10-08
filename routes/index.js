const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const Review = require('../models/Review');

// Helper: language selection
function getLang(req) {
  return req.query.lang || 'lo'; // default ลาว
}

// Home Page
router.get('/', async (req, res) => {
  const cars = await Car.find().sort({ dateAdded: -1 }).limit(10);
  res.render('index', { cars, lang: getLang(req) });
});

// Car Details
router.get('/car/:id', async (req, res) => {
  const car = await Car.findById(req.params.id);
  res.render('car-details', { car, lang: getLang(req) });
});

// Submit car
router.get('/submit-car', (req, res) => res.render('submit-car', { lang: getLang(req) }));
router.post('/submit-car', async (req, res) => {
  const car = new Car(req.body);
  await car.save();
  res.redirect('/');
});

// Compare
router.get('/compare', async (req, res) => {
  const cars = await Car.find().limit(5);
  res.render('compare', { cars, lang: getLang(req) });
});

// Reviews
router.get('/reviews', async (req, res) => {
  const reviews = await Review.find().sort({ date: -1 });
  res.render('reviews', { reviews, lang: getLang(req) });
});
router.post('/reviews', async (req, res) => {
  const review = new Review(req.body);
  await review.save();
  res.redirect('/reviews');
});

// Contact
router.get('/contact', (req, res) => res.render('contact', { lang: getLang(req) }));

module.exports = router;