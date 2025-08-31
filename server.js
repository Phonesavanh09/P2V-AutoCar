const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const multer = require('multer'); // เพิ่ม Multer
require('dotenv').config();

const app = express();

mongoose.set('strictQuery', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

// ตั้งค่า Multer สำหรับการอัปโหลด
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); // โฟลเดอร์เก็บรูป
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // ชื่อไฟล์ไม่ซ้ำ
    }
});
const upload = multer({ storage: storage });

app.use('/', require('./routes/index'));
app.use('/admin', require('./routes/admin'));

// Route สำหรับอัปโหลดรูป (สมมติให้ admin อัปโหลด)
app.post('/admin/upload', upload.single('carImage'), async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).send('Unauthorized');
    }
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    const imagePath = '/uploads/' + req.file.filename; // พาธสำหรับแสดง
    // บันทึกข้อมูลลง MongoDB (สมมติใช้ model Car)
    const Car = require('./models/Car');
    const newCar = new Car({
        name: req.body.carName || 'New Car',
        price: parseInt(req.body.price) || 0,
        image: imagePath
    });
    await newCar.save();
    res.redirect('/admin/cars');
});

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));