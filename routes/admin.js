const express = require('express');
const router = express.Router();
const Car = require('../models/Car');

// Admin Auth
router.use((req, res, next) => {
  if(req.session.adminLoggedIn) return next();
  if(req.path === '/login') return next();
  res.redirect('/admin/login');
});

// Login
router.get('/login', (req, res) => res.render('admin/login'));
router.post('/login', (req, res) => {
  const { password } = req.body;
  if(password === process.env.ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login');
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  const cars = await Car.find();
  res.render('admin/dashboard', { cars });
});

// Add/Edit/Delete
router.get('/add-car', (req, res) => res.render('admin/add-car'));
router.post('/add-car', async (req, res) => {
  const car = new Car(req.body);
  await car.save();
  res.redirect('/admin/dashboard');
});
router.get('/edit-car/:id', async (req, res) => {
  const car = await Car.findById(req.params.id);
  res.render('admin/edit-car', { car });
});
router.post('/edit-car/:id', async (req, res) => {
  await Car.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/admin/dashboard');
});
router.get('/delete-car/:id', async (req, res) => {
  await Car.findByIdAndDelete(req.params.id);
  res.redirect('/admin/dashboard');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

module.exports = router;