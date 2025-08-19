const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const SellRequest = require('../models/SellRequest');
const Review = require('../models/Review');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('เฉพาะไฟล์ JPEG และ PNG เท่านั้น!'));
        }
    }
}).array('images', 10);

router.get('/', async (req, res) => {
    try {
        const { province } = req.query;
        const page = parseInt(req.query.page) || 1; // หน้าเริ่มต้นคือ 1
        const limit = 12; // จำนวนรถต่อหน้า

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        let carsQuery = Car.find().sort({ createdAt: -1 }); // เรียงตามวันที่ล่าสุด (ใหม่สุดขึ้นก่อน)
        if (province) {
            carsQuery = carsQuery.where('province').equals(province);
            console.log(`Filtering cars for province: ${province}`);
        }
        const cars = await carsQuery;
        const paginatedCars = cars.slice(startIndex, endIndex);

        const totalPages = Math.ceil(cars.length / limit);

        const reviews = await Review.find().sort({ createdAt: -1 }).limit(5);
        res.render('index', { 
            cars: paginatedCars, 
            reviews, 
            lang: req.query.lang || 'la', 
            provinces: getProvinces(), 
            selectedProvince: province,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error('Error fetching cars:', err);
        res.render('index', { 
            cars: [], 
            reviews: [], 
            lang: req.query.lang || 'la', 
            provinces: getProvinces(), 
            selectedProvince: null,
            currentPage: 1,
            totalPages: 1
        });
    }
});

router.get('/car/:id', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.redirect('/');
        res.render('car-detail', { car, lang: req.query.lang || 'la' });
    } catch (err) {
        console.error('Error fetching car detail:', err);
        res.redirect('/');
    }
});

router.get('/sell-car', (req, res) => {
    res.render('sell-car', { lang: req.query.lang || 'la', error: null, provinces: getProvinces() });
});

router.post('/sell-car', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.render('sell-car', { lang: req.query.lang || 'la', error: err.message, provinces: getProvinces() });
        }
        try {
            const { brand, model, year, price, transmission, contact, province } = req.body;
            const images = req.files.map(file => `/uploads/${file.filename}`);
            const sellRequest = new SellRequest({
                brand,
                model,
                year: parseInt(year),
                price: parseInt(price),
                transmission,
                contact,
                images,
                province
            });
            await sellRequest.save();
            res.redirect('/?success=Request submitted successfully');
        } catch (err) {
            console.error('Error saving sell request:', err);
            res.render('sell-car', { lang: req.query.lang || 'la', error: 'เกิดข้อผิดพลาดในการส่งคำขอ', provinces: getProvinces() });
        }
    });
});

router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.render('reviews', { lang: req.query.lang || 'la', reviews });
    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.render('reviews', { lang: req.query.lang || 'la', reviews: [] });
    }
});

router.post('/reviews', async (req, res) => {
    try {
        const { author, text } = req.body;
        const review = new Review({ author, text });
        await review.save();
        res.redirect('/reviews?success=Review submitted successfully');
    } catch (err) {
        console.error('Error saving review:', err);
        res.render('reviews', { lang: req.query.lang || 'la', reviews: [], error: 'เกิดข้อผิดพลาดในการส่งรีวิว' });
    }
});

router.get('/contact', (req, res) => {
    res.render('contact', { lang: req.query.lang || 'la', error: null });
});

router.post('/contact', (req, res) => {
    res.redirect('/contact?success=Message sent successfully');
});

function getProvinces() {
    return [
        'ນະຄອນຫຼວງ', 'ວຽງຈັນ', 'ຫຼວງພະບາງ', 'ສະຫວັນນະເຂດ', 'ຈໍາປາສັກ', 'ຊຽງຂວາງ',
        'ຫົວພັນ', 'ຜົ້ງສາລີ', 'ອຸດົມໄຊ', 'ບໍ່ແກ້ວ', 'ຫຼວງນໍ້າທາ',
        'ໄຊສົມບູນ', 'ສາລະວັນ', 'ໄຊຍະບູລີ', 'ບໍລິຄຳໄຊ', 'ເຊກອງ',
        'ຄຳມ່ວນ', 'ອັດຕະປື'
    ];
}

module.exports = router;