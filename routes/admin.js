const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const SellRequest = require('../models/SellRequest');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'car_images', allowed_formats: ['jpg', 'jpeg', 'png'] }
});
const upload = multer({ storage }).array('images', 10);

function getProvinces() {
    return [
        'ວຽງຈັນ', 'ຜົ້ງສາລີ', 'ຫຼວງນ້ຳທາ', 'ອຸດົມໄຊ', 'ບໍ່ແກ້ວ',
        'ຫຼວງພະບາງ', 'ຫົວພັນ', 'ໄຊຍະບູລີ', 'ຊຽງຂວາງ', 'ວຽງຈັນແຂວງ',
        'ບໍລິຄຳໄຊ', 'ຄຳມ່ວນ', 'ສະຫວັນນະເຂດ', 'ສາລະວັນ', 'ເຊກອງ',
        'ຈຳປາສັກ', 'ອັດຕະປື'
    ];
}

router.get('/login', (req, res) => {
    res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') { // ควรใช้การเข้ารหัสในอนาคต
        req.session.admin = true;
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin/login', { error: 'ຊື່ຜູ້ໃຊ້ ຫຼືລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
    }
});

router.get('/dashboard', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    res.render('admin/dashboard');
});

router.get('/manage-car', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        const cars = await Car.find();
        res.render('admin/manage-car', { cars });
    } catch (err) {
        console.error('Error fetching cars:', err);
        res.render('admin/manage-car', { cars: [] });
    }
});

router.get('/manage-sell-requests', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        const sellRequests = await SellRequest.find();
        res.render('admin/manage-sell-requests', { sellRequests });
    } catch (err) {
        console.error('Error fetching sell requests:', err);
        res.render('admin/manage-sell-requests', { sellRequests: [] });
    }
});

router.post('/add-car', upload, async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        const { brand, model, year, price, transmission, mileage, description, province, coverImageIndex, noFlood, noMajorAccident, noFire, isPremium } = req.body;
        const images = req.files.map(file => file.path);
        const coverImage = images[coverImageIndex] || images[0];
        const car = new Car({
            brand,
            model,
            year: parseInt(year),
            price: parseInt(price),
            transmission,
            mileage: parseInt(mileage),
            images,
            description,
            province,
            coverImage,
            inspected: {
                noFlood: noFlood === 'on',
                noMajorAccident: noMajorAccident === 'on',
                noFire: noFire === 'on'
            },
            isPremium: isPremium === 'on'
        });
        await car.save();
        res.redirect('/admin/manage-car');
    } catch (err) {
        console.error('Error adding car:', err);
        res.redirect('/admin/manage-car');
    }
});

router.get('/edit-car/:id', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.redirect('/admin/manage-car');
        res.render('admin/edit-car', { car, provinces: getProvinces(), error: null });
    } catch (err) {
        console.error('Error fetching car:', err);
        res.redirect('/admin/manage-car');
    }
});

router.post('/edit-car/:id', upload, async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        const { brand, model, year, price, transmission, mileage, description, province, coverImageIndex, noFlood, noMajorAccident, noFire, isPremium, existingImages } = req.body;
        const images = req.files.length > 0 ? req.files.map(file => file.path) : JSON.parse(existingImages || '[]');
        const coverImage = images[coverImageIndex] || images[0];
        const updateData = {
            brand,
            model,
            year: parseInt(year),
            price: parseInt(price),
            transmission,
            mileage: parseInt(mileage),
            images,
            description,
            province,
            coverImage,
            inspected: {
                noFlood: noFlood === 'on',
                noMajorAccident: noMajorAccident === 'on',
                noFire: noFire === 'on'
            },
            isPremium: isPremium === 'on'
        };
        await Car.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin/manage-car');
    } catch (err) {
        console.error('Error updating car:', err);
        const car = await Car.findById(req.params.id);
        res.render('admin/edit-car', {
            car,
            provinces: getProvinces(),
            error: 'ເກີດຂໍ້ຜິດພາດໃນການອັບເດດ'
        });
    }
});

router.post('/delete-car/:id', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.redirect('/admin/manage-car');
    } catch (err) {
        console.error('Error deleting car:', err);
        res.redirect('/admin/manage-car');
    }
});

router.post('/approve-sell-request/:id', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        const sellRequest = await SellRequest.findById(req.params.id);
        if (!sellRequest) return res.redirect('/admin/manage-sell-requests');
        const car = new Car({
            sellerName: sellRequest.sellerName,
            sellerPhone: sellRequest.phone,
            brand: sellRequest.brand,
            model: sellRequest.model,
            year: sellRequest.year,
            price: sellRequest.price,
            transmission: sellRequest.transmission,
            mileage: sellRequest.mileage,
            images: sellRequest.images,
            description: sellRequest.description,
            province: sellRequest.province,
            coverImage: sellRequest.coverImage,
            inspected: sellRequest.inspected,
            status: 'available'
        });
        await car.save();
        await SellRequest.findByIdAndUpdate(req.params.id, { status: 'approved' });
        res.redirect('/admin/manage-sell-requests');
    } catch (err) {
        console.error('Error approving sell request:', err);
        res.redirect('/admin/manage-sell-requests');
    }
});

router.post('/reject-sell-request/:id', async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/login');
    try {
        await SellRequest.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.redirect('/admin/manage-sell-requests');
    } catch (err) {
        console.error('Error rejecting sell request:', err);
        res.redirect('/admin/manage-sell-requests');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

module.exports = router;