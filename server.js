const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'ejs');

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/car_dealer', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Multer Setup
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('ໄຟລ໌ຕ້ອງເປັນຮູບພາບ (jpg, jpeg, png)'));
        }
    }
}).array('images', 10);

// Sample Provinces
const provinces = [
    'ນະຄອນຫຼວງວຽງຈັນ', 'ຜົ້ງສາລີ', 'ຫຼວງນໍ້າທາ', 'ອຸດົມໄຊ', 'ບໍ່ແກ້ວ', 'ຫຼວງພະບາງ',
    'ຫົວພັນ', 'ໄຊຍະບູລີ', 'ຊຽງຂວາງ', 'ວຽງຈັນ', 'ບໍລິຄຳໄຊ', 'ຄຳມ່ວນ', 'ສະຫວັນນະເຂດ',
    'ສາລະວັນ', 'ເຊກອງ', 'ຈຳປາສັກ', 'ອັດຕະປື', 'ໄຊສົມບູນ'
];

// Car Schema
const carSchema = new mongoose.Schema({
    brand: String,
    model: String,
    carType: String,
    year: Number,
    price: Number,
    transmission: String,
    mileage: Number,
    description: String,
    province: String,
    images: [String],
    coverImage: String,
    coverImageIndex: Number,
    isPremium: Boolean,
    inspected: {
        noFlood: Boolean,
        noMajorAccident: Boolean,
        noFire: Boolean
    }
});
const Car = mongoose.model('Car', carSchema);

// Sell Request Schema
const sellRequestSchema = new mongoose.Schema({
    sellerName: String,
    phone: String,
    brand: String,
    model: String,
    carType: String,
    year: Number,
    price: Number,
    transmission: String,
    mileage: Number,
    description: String,
    province: String,
    images: [String],
    status: { type: String, default: 'pending' }
});
const SellRequest = mongoose.model('SellRequest', sellRequestSchema);

// Routes
app.get('/', async (req, res) => {
    try {
        const { search = '', carType = '', province = '', page = 1 } = req.query;
        const limit = 9;
        const skip = (page - 1) * limit;
        let query = {};
        if (search) query.$or = [{ brand: new RegExp(search, 'i') }, { model: new RegExp(search, 'i') }];
        if (carType) query.carType = carType;
        if (province) query.province = province;

        const cars = await Car.find(query).skip(skip).limit(limit);
        const premiumCars = await Car.find({ isPremium: true }).limit(6);
        const totalCars = await Car.countDocuments(query);
        const totalPages = Math.ceil(totalCars / limit);

        res.render('index', {
            cars: cars || [],
            premiumCars: premiumCars || [],
            searchQuery: search,
            carType: carType,
            provinceQuery: province,
            provinces: provinces,
            currentPage: parseInt(page),
            totalPages: totalPages || 1
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນລົດໄດ້', error: null });
    }
});

app.get('/car/:id', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.render('error', { message: 'ບໍ່ພົບລົດ', error: null });
        res.render('car-detail', { car, provinces: provinces, error: null });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດໂຫຼດລາຍລະອຽດລົດໄດ້', error: null });
    }
});

app.get('/sell-car', (req, res) => {
    res.render('sell-car', { provinces: provinces, error: null, success: null });
});

app.post('/sell-car', upload, async (req, res) => {
    try {
        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const sellRequest = new SellRequest({
            ...req.body,
            images
        });
        await sellRequest.save();
        res.render('sell-car', { provinces: provinces, error: null, success: 'ສົ່ງຄຳຂໍຂາຍສຳເລັດ!' });
    } catch (err) {
        console.error(err);
        res.render('sell-car', { provinces: provinces, error: err.message, success: null });
    }
});

app.get('/admin/login', (req, res) => {
    res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    // Replace with real authentication in production
    if (username === 'admin' && password === 'password') {
        req.session.isAdmin = true;
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin/login', { error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
    }
});

app.get('/admin/dashboard', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const totalCars = await Car.countDocuments();
        const pendingRequests = await SellRequest.countDocuments({ status: 'pending' });
        const premiumCars = await Car.countDocuments({ isPremium: true });
        const sedanCount = await Car.countDocuments({ carType: 'Sedan' });
        const hatchbackCount = await Car.countDocuments({ carType: 'Hatchback' });
        const pickupCount = await Car.countDocuments({ carType: 'Pickup' });
        const crossoverCount = await Car.countDocuments({ carType: 'Crossover' });
        const suvCount = await Car.countDocuments({ carType: 'SUV' });
        const ppvCount = await Car.countDocuments({ carType: 'PPV' });
        const mpvCount = await Car.countDocuments({ carType: 'MPV' });

        res.render('admin/dashboard', {
            totalCars: totalCars || 0,
            pendingRequests: pendingRequests || 0,
            premiumCars: premiumCars || 0,
            sedanCount: sedanCount || 0,
            hatchbackCount: hatchbackCount || 0,
            pickupCount: pickupCount || 0,
            crossoverCount: crossoverCount || 0,
            suvCount: suvCount || 0,
            ppvCount: ppvCount || 0,
            mpvCount: mpvCount || 0,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດໂຫຼດແຜງຄວບຄຸມໄດ້', error: null });
    }
});

app.get('/admin/manage-car', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const cars = await Car.find();
        res.render('admin/manage-car', { cars: cars || [], error: null });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດໂຫຼດລາຍການລົດໄດ້', error: null });
    }
});

app.get('/admin/add-car', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    res.render('admin/add-car', { provinces: provinces, error: null, success: null });
});

app.post('/admin/add-car', upload, async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const coverImageIndex = parseInt(req.body.coverImageIndex) || 0;
        const car = new Car({
            ...req.body,
            images,
            coverImage: images[coverImageIndex] || images[0] || '/images/placeholder.jpg',
            coverImageIndex,
            isPremium: req.body.isPremium === 'on',
            inspected: {
                noFlood: req.body.noFlood === 'on',
                noMajorAccident: req.body.noMajorAccident === 'on',
                noFire: req.body.noFire === 'on'
            }
        });
        await car.save();
        res.render('admin/add-car', { provinces: provinces, error: null, success: 'ເພີ່ມລົດສຳເລັດ!' });
    } catch (err) {
        console.error(err);
        res.render('admin/add-car', { provinces: provinces, error: err.message, success: null });
    }
});

app.get('/admin/edit-car/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.render('error', { message: 'ບໍ່ພົບລົດ', error: null });
        res.render('admin/edit-car', { car, provinces: provinces, error: null, success: null });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດໂຫຼດລົດໄດ້', error: null });
    }
});

app.put('/admin/edit-car/:id', upload, async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.render('error', { message: 'ບໍ່ພົບລົດ', error: null });

        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : car.images;
        const deleteImages = req.body.deleteImages || [];
        car.images = car.images.filter((_, index) => !deleteImages.includes(index.toString())).concat(images);
        const coverImageIndex = parseInt(req.body.coverImageIndex) || 0;

        Object.assign(car, {
            ...req.body,
            images,
            coverImage: car.images[coverImageIndex] || car.images[0] || '/images/placeholder.jpg',
            coverImageIndex,
            isPremium: req.body.isPremium === 'on',
            inspected: {
                noFlood: req.body.noFlood === 'on',
                noMajorAccident: req.body.noMajorAccident === 'on',
                noFire: req.body.noFire === 'on'
            }
        });

        await car.save();
        res.render('admin/edit-car', { car, provinces: provinces, error: null, success: 'ແກ້ໄຂລົດສຳເລັດ!' });
    } catch (err) {
        console.error(err);
        res.render('admin/edit-car', { car: req.body, provinces: provinces, error: err.message, success: null });
    }
});

app.delete('/admin/delete-car/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.redirect('/admin/manage-car');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດລົບລົດໄດ້', error: null });
    }
});

app.get('/admin/manage-sell-requests', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const requests = await SellRequest.find();
        res.render('admin/manage-sell-requests', { requests: requests || [], error: null });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດໂຫຼດຄຳຂໍຂາຍໄດ້', error: null });
    }
});

app.put('/admin/approve-sell-request/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const request = await SellRequest.findById(req.params.id);
        if (!request) return res.render('error', { message: 'ບໍ່ພົບຄຳຂໍ', error: null });
        request.status = 'approved';
        await request.save();

        const car = new Car({
            ...request.toObject(),
            coverImage: request.images[0] || '/images/placeholder.jpg',
            coverImageIndex: 0,
            isPremium: false,
            inspected: {
                noFlood: false,
                noMajorAccident: false,
                noFire: false
            }
        });
        await car.save();
        res.redirect('/admin/manage-sell-requests');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດອະນຸມັດຄຳຂໍໄດ້', error: null });
    }
});

app.put('/admin/reject-sell-request/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin/login');
    try {
        const request = await SellRequest.findById(req.params.id);
        if (!request) return res.render('error', { message: 'ບໍ່ພົບຄຳຂໍ', error: null });
        request.status = 'rejected';
        await request.save();
        res.redirect('/admin/manage-sell-requests');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'ບໍ່ສາມາດປະຕິເສດຄຳຂໍໄດ້', error: null });
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.render('error', { message: err.message || 'ມີບາງຢ່າງຜິດພາດ!', error: null });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));