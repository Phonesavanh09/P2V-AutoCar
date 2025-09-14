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

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const selectedProvince = req.query.province || '';
        const sort = req.query.sort || 'default';
        let query = { status: 'available' };

        if (selectedProvince) query.province = selectedProvince;

        let sortOption = {};
        if (sort === 'price_asc') sortOption.price = 1;
        else if (sort === 'price_desc') sortOption.price = -1;
        else sortOption.createdAt = -1;

        const totalCars = await Car.countDocuments(query);
        const cars = await Car.find(query).sort(sortOption).skip(skip).limit(limit);
        const totalPages = Math.ceil(totalCars / limit);

        res.render('index', {
            cars,
            provinces: getProvinces(),
            selectedProvince,
            sort,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error('Error fetching cars:', err);
        res.render('index', {
            cars: [],
            provinces: getProvinces(),
            selectedProvince: '',
            sort: 'default',
            currentPage: 1,
            totalPages: 1
        });
    }
});

router.get('/car/:id', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.redirect('/');
        res.render('car-detail', { car });
    } catch (err) {
        console.error('Error fetching car:', err);
        res.redirect('/');
    }
});

router.get('/sell-car', (req, res) => {
    res.render('sell-car', { error: null, success: null, provinces: getProvinces() });
});

router.post('/sell-car', upload, async (req, res) => {
    try {
        const { sellerName, phone, brand, model, year, price, transmission, mileage, description, province, coverImageIndex, noFlood, noMajorAccident, noFire } = req.body;
        const images = req.files.map(file => file.path);
        const coverImage = images[coverImageIndex] || images[0];
        const sellRequest = new SellRequest({
            sellerName,
            phone,
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
            }
        });
        await sellRequest.save();
        res.render('sell-car', {
            error: null,
            success: 'ສົ່ງຄຳຂໍຂາຍສຳເລັດ, ລໍຖ້າການອະນຸມັດ',
            provinces: getProvinces()
        });
    } catch (err) {
        console.error('Error submitting sell request:', err);
        res.render('sell-car', {
            error: 'ເກີດຂໍ້ຜິດພາດໃນການສົ່ງຄຳຂໍ',
            success: null,
            provinces: getProvinces()
        });
    }
});

module.exports = router;