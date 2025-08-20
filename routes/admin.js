const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const SellRequest = require('../models/SellRequest');
const Review = require('../models/Review');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'car_images',
        allowed_formats: ['jpg', 'jpeg', 'png'],
    },
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

router.use((req, res, next) => {
    const allowedRoutes = ['/login', '/logout'];
    if (!req.session.isAdmin && !allowedRoutes.includes(req.path)) {
        return res.redirect('/admin/login');
    }
    next();
});

router.get('/dashboard', async (req, res) => {
    try {
        const cars = await Car.find();
        const sellRequests = await SellRequest.find();
        const reviews = await Review.find();
        res.render('admin/dashboard', { cars, sellRequests, reviews, lang: req.query.lang || 'la' });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.render('admin/dashboard', { cars: [], sellRequests: [], reviews: [], lang: req.query.lang || 'la' });
    }
});

router.get('/add-car', (req, res) => {
    try {
        const provinces = getProvinces();
        console.log('Provinces loaded:', provinces);
        res.render('admin/add-car', { lang: req.query.lang || 'la', error: null, provinces });
    } catch (err) {
        console.error('Error loading add-car page:', err);
        res.render('admin/add-car', { lang: req.query.lang || 'la', error: 'เกิดข้อผิดพลาดในการโหลดหน้า', provinces: [] });
    }
});

router.post('/add-car', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.render('admin/add-car', { lang: req.query.lang || 'la', error: err.message, provinces: getProvinces() });
        }
        try {
            const { brand, model, year, price, transmission, description, province, coverImageIndex, status } = req.body;
            const images = req.files.map(file => file.path);
            const coverImage = images[parseInt(coverImageIndex)] || images[0];
            const car = new Car({
                brand,
                model,
                year: parseInt(year),
                price: parseInt(price),
                transmission,
                images,
                description,
                province,
                coverImage,
                status: status || 'available'
            });
            await car.save();
            res.redirect('/admin/dashboard?success=Car added successfully');
        } catch (error) {
            console.error('Error saving car:', error);
            res.render('admin/add-car', { lang: req.query.lang || 'la', error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', provinces: getProvinces() });
        }
    });
});

router.get('/manage-car', async (req, res) => {
    try {
        const { sort } = req.query; // เพิ่มตัวเลือกเรียง
        let carsQuery = Car.find().sort({ postedDate: -1 }); // เรียงตามวันที่ล่าสุด (ใหม่สุดขึ้นก่อน)
        if (sort === 'price_asc') {
            carsQuery = carsQuery.sort({ price: 1 }); // เรียงราคาจากน้อยไปมาก
        } else if (sort === 'price_desc') {
            carsQuery = carsQuery.sort({ price: -1 }); // เรียงราคาจากมากไปน้อย
        }
        const cars = await carsQuery;
        res.render('admin/manage-car', { cars, lang: req.query.lang || 'la', error: null, success: req.query.success, provinces: getProvinces(), sort: sort || 'default' });
    } catch (err) {
        console.error('Error fetching cars:', err);
        res.render('admin/manage-car', { cars: [], lang: req.query.lang || 'la', error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรถ', provinces: getProvinces(), sort: 'default' });
    }
});

router.get('/edit-car/:id', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.redirect('/admin/manage-car');
        res.render('admin/edit-car', { car, lang: req.query.lang || 'la', error: null, provinces: getProvinces() });
    } catch (err) {
        console.error('Error fetching car:', err);
        res.redirect('/admin/manage-car');
    }
});

router.post('/edit-car/:id', upload, async (req, res) => {
    try {
        const { brand, model, year, price, transmission, description, province, coverImageIndex, status } = req.body;
        const images = req.files.length > 0 ? req.files.map(file => file.path) : undefined;
        const updateData = {
            brand,
            model,
            year: parseInt(year),
            price: parseInt(price),
            transmission,
            description,
            province,
            status: status || 'available'
        };
        if (images) {
            updateData.images = images;
            updateData.coverImage = images[parseInt(coverImageIndex)] || images[0];
        } else if (coverImageIndex && req.body.existingImages) {
            const existingImages = JSON.parse(req.body.existingImages);
            updateData.coverImage = existingImages[parseInt(coverImageIndex)] || existingImages[0];
        }
        await Car.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin/manage-car?success=Car updated successfully');
    } catch (err) {
        console.error('Error updating car:', err);
        res.render('admin/edit-car', { car: req.body, lang: req.query.lang || 'la', error: 'เกิดข้อผิดพลาดในการอัปเดตรถ', provinces: getProvinces() });
    }
});

router.get('/delete-car/:id', async (req, res) => {
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.redirect('/admin/manage-car?success=Car deleted successfully');
    } catch (err) {
        console.error('Error deleting car:', err);
        res.redirect('/admin/manage-car?error=Failed to delete car');
    }
});

router.get('/sell-request/:id', async (req, res) => {
    try {
        const sellRequest = await SellRequest.findById(req.params.id);
        if (!sellRequest) return res.redirect('/admin/dashboard');
        res.render('admin/sell-request-detail', { sellRequest, lang: req.query.lang || 'la' });
    } catch (err) {
        console.error('Error fetching sell request:', err);
        res.redirect('/admin/dashboard');
    }
});

router.get('/delete-sell-request/:id', async (req, res) => {
    try {
        await SellRequest.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard?success=Sell request deleted successfully');
    } catch (err) {
        console.error('Error deleting sell request:', err);
        res.redirect('/admin/dashboard?error=Failed to delete sell request');
    }
});

router.get('/delete-review/:id', async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard?success=Review deleted successfully');
    } catch (err) {
        console.error('Error deleting review:', err);
        res.redirect('/admin/dashboard?error=Failed to delete review');
    }
});

router.get('/login', (req, res) => {
    res.render('admin/login', { error: req.query.error === 'true', lang: req.query.lang || 'la' });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'your_secure_password') {
        req.session.isAdmin = true;
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin/login?error=true');
    }
});

router.get('/', (req, res) => {
    if (req.session.isAdmin) {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin/login');
    }
}); 

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

router.get('/', (req, res) => {
    res.redirect('/admin/dashboard');
});

function getProvinces() {
    return [
        'ນະຄອນຫຼວງ','ວຽງຈັນ', 'ຫຼວງພະບາງ', 'ສະຫວັນນະເຂດ', 'ຈໍາປາສັກ', 'ຊຽງຂວາງ',
        'ຫົວພັn', 'ຜົ້ງສາລີ', 'ອຸດົມໄຊ', 'ບໍ່ແກ້ວ', 'ຫຼວງນໍ້າທາ',
        'ໄຊສົມບູນ', 'ສາລະວັນ', 'ໄຊຍະບູລີ', 'ບໍລິຄຳໄຊ', 'ເຊກອງ',
        'ຄຳມ່ວນ', 'ອັດຕະປື'
    ];
}

module.exports = router;