const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const methodOverride = require('method-override');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/car_dealer', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Schemas
const carSchema = new mongoose.Schema({
    brand: String,
    model: String,
    year: Number,
    price: Number,
    color: String,
    location: String,
    images: [String],
    coverImage: String,
    coverImageIndex: Number,
    isPremium: Boolean,
    isDeal: Boolean,
    isWorryFree: Boolean,
    isHot: Boolean,
    isNew: Boolean
});

const sellRequestSchema = new mongoose.Schema({
    brand: String,
    model: String,
    year: Number,
    price: Number,
    color: String,
    location: String,
    images: [String]
});

const Car = mongoose.model('Car', carSchema);
const SellRequest = mongoose.model('SellRequest', sellRequestSchema);

// File Upload
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
            return cb(null, true);
        } else {
            cb('Error: Images only!');
        }
    }
}).array('images', 10);

// Provinces
const provinces = [
    'ນະຄອນຫຼວງວຽງຈັນ', 'ຜົ້ງສາລີ', 'ຫຼວງນ້ຳທາ', 'ອຸດົມໄຊ', 'ບໍ່ແກ້ວ', 'ຫຼວງພະບາງ',
    'ຫົວພັນ', 'ໄຊຍະບູລີ', 'ຊຽງຂວາງ', 'ວຽງຈັນ', 'ບໍລິຄຳໄຊ', 'ຄຳມ່ວນ', 'ສະຫວັນນະເຂດ',
    'ສາລະວັນ', 'ເຊກອງ', 'ຈຳປາສັກ', 'ອັດຕະປື', 'ໄຊສົມບູນ'
];

// Routes
app.get('/', async (req, res) => {
    const { search = '', carType = '', province = '', sort = 'new-old', page = 1 } = req.query;
    const perPage = 9;
    let query = {};
    if (search) query = { $or: [{ brand: new RegExp(search, 'i') }, { model: new RegExp(search, 'i') }] };
    if (carType) query.carType = carType;
    if (province) query.location = province;

    let sortOption = {};
    if (sort === 'price-high-low') sortOption = { price: -1 };
    else if (sort === 'price-low-high') sortOption = { price: 1 };
    else if (sort === 'year-old-new') sortOption = { year: 1 };
    else sortOption = { _id: -1 }; // new-old

    try {
        const cars = await Car.find(query).sort(sortOption).skip((page - 1) * perPage).limit(perPage);
        const premiumCars = await Car.find({ isPremium: true }).limit(3);
        const totalCars = await Car.countDocuments(query);
        const totalPages = Math.ceil(totalCars / perPage);

        res.render('index', {
            cars: cars || [],
            premiumCars: premiumCars || [],
            searchQuery: search,
            carType: carType,
            provinceQuery: province,
            provinces: provinces,
            currentPage: parseInt(page),
            totalPages: totalPages || 1,
            error: null
        });
    } catch (err) {
        res.render('error', { message: 'Error fetching cars', error: err.message });
    }
});

app.get('/car/:id', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.render('error', { message: 'Car not found', error: null });
        res.render('car-detail', { car, provinces, error: null });
    } catch (err) {
        res.render('error', { message: 'Error fetching car details', error: err.message });
    }
});

app.get('/sell-car', (req, res) => {
    res.render('sell-car', { provinces, error: null, success: null });
});

app.post('/sell-car', upload, async (req, res) => {
    try {
        const { brand, model, year, price, color, location } = req.body;
        const images = req.files.map(file => `/uploads/${file.filename}`);
        const sellRequest = new SellRequest({ brand, model, year, price, color, location, images });
        await sellRequest.save();
        res.render('sell-car', { provinces, error: null, success: 'Sell request submitted successfully' });
    } catch (err) {
        res.render('sell-car', { provinces, error: 'Error submitting sell request', success: null });
    }
});

app.get('/admin-secret/login', (req, res) => {
    res.render('admin/login', { error: null });
});

app.post('/admin-secret/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password') {
        req.session.isAdmin = true;
        return res.redirect('/admin-secret/dashboard');
    }
    res.render('admin/login', { error: 'Invalid credentials' });
});

app.get('/admin-secret/dashboard', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        const totalCars = await Car.countDocuments();
        const pendingRequests = await SellRequest.countDocuments();
        const premiumCars = await Car.countDocuments({ isPremium: true });
        res.render('admin/dashboard', { totalCars, pendingRequests, premiumCars });
    } catch (err) {
        res.render('error', { message: 'Error fetching dashboard data', error: err.message });
    }
});

app.get('/admin-secret/manage-car', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        const cars = await Car.find();
        res.render('admin/manage-car', { cars, error: null });
    } catch (err) {
        res.render('error', { message: 'Error fetching cars', error: err.message });
    }
});

app.get('/admin-secret/add-car', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    res.render('admin/add-car', { provinces, error: null });
});

app.post('/admin-secret/add-car', upload, async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        const { brand, model, year, price, color, location, isPremium } = req.body;
        const images = req.files.map(file => `/uploads/${file.filename}`);
        const car = new Car({
            brand, model, year, price, color, location, images,
            coverImage: images[0] || '/images/placeholder.jpg',
            coverImageIndex: 0,
            isPremium: isPremium === 'on',
            isDeal: false,
            isWorryFree: false,
            isHot: false,
            isNew: true
        });
        await car.save();
        res.redirect('/admin-secret/manage-car');
    } catch (err) {
        res.render('admin/add-car', { provinces, error: 'Error adding car' });
    }
});

app.get('/admin-secret/edit-car/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.render('error', { message: 'Car not found', error: null });
        res.render('admin/edit-car', { car, provinces, error: null });
    } catch (err) {
        res.render('error', { message: 'Error fetching car', error: err.message });
    }
});

app.put('/admin-secret/edit-car/:id', upload, async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        const { brand, model, year, price, color, location, isPremium } = req.body;
        const images = req.files.length > 0 ? req.files.map(file => `/uploads/${file.filename}`) : undefined;
        const updateData = { brand, model, year, price, color, location, isPremium: isPremium === 'on' };
        if (images) {
            updateData.images = images;
            updateData.coverImage = images[0];
            updateData.coverImageIndex = 0;
        }
        await Car.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin-secret/manage-car');
    } catch (err) {
        res.render('admin/edit-car', { car: req.body, provinces, error: 'Error updating car' });
    }
});

app.delete('/admin-secret/delete-car/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.redirect('/admin-secret/manage-car');
    } catch (err) {
        res.render('error', { message: 'Error deleting car', error: err.message });
    }
});

app.get('/admin-secret/manage-sell-requests', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        const requests = await SellRequest.find();
        res.render('admin/manage-sell-requests', { requests, error: null });
    } catch (err) {
        res.render('error', { message: 'Error fetching sell requests', error: err.message });
    }
});

app.put('/admin-secret/approve-request/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        const request = await SellRequest.findById(req.params.id);
        if (!request) return res.render('error', { message: 'Request not found', error: null });
        const car = new Car({
            brand: request.brand,
            model: request.model,
            year: request.year,
            price: request.price,
            color: request.color,
            location: request.location,
            images: request.images,
            coverImage: request.images[0] || '/images/placeholder.jpg',
            coverImageIndex: 0,
            isPremium: false,
            isDeal: true,
            isWorryFree: true,
            isHot: false,
            isNew: true
        });
        await car.save();
        await SellRequest.findByIdAndDelete(req.params.id);
        res.redirect('/admin-secret/manage-sell-requests');
    } catch (err) {
        res.render('error', { message: 'Error approving request', error: err.message });
    }
});

app.delete('/admin-secret/reject-request/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin-secret/login');
    try {
        await SellRequest.findByIdAndDelete(req.params.id);
        res.redirect('/admin-secret/manage-sell-requests');
    } catch (err) {
        res.render('error', { message: 'Error rejecting request', error: err.message });
    }
});

app.get('/admin-secret/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin-secret/login');
});

app.use((req, res) => {
    res.status(404).render('error', { message: 'Page not found', error: null });
});

app.listen(3000, () => console.log('Server running on port 3000'));