const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cookieParser = require('cookie-parser');


const swaggerDocument = YAML.load('./swagger.yaml')
const corsConfig = require('./src/configs/cors.config');
// api for client
const categoryApis = require('./src/apis/category.api');
const courseApis = require('./src/apis/course.api');
const loginApis = require('./src/apis/login.api');
const accountApis = require('./src/apis/account.api');
const chapterApis = require('./src/apis/chapter.api');
const lessonApis = require('./src/apis/lesson.api')
const userApis = require('./src/apis/user.api');
const cartApis = require('./src/apis/cart.api');
const teacherApis = require('./src/apis/teacher.api');
const paymentApis = require('./src/apis/payment.api');
const couponApis = require('./src/apis/coupon.api');
const chatApis = require('./src/apis/chat.api');
const invoiceApis = require('./src/apis/invoice.api');
const rateApis = require('./src/apis/rate.api');
// apis for admin
const adminUserApis = require('./src/apis/adminUser.api');


const dev = app.get('env') !== 'production';


const MONGO_URI = dev ? process.env.MONGO_URI_LOCAL : process.env.MONGO_URI;
const mongoose = require('mongoose');
mongoose.connect(MONGO_URI, {})
    .then(result => console.log('> Connect mongoDB successful ', MONGO_URI))
    .catch(err => console.log(`> Error while connecting to mongoDB : >> : ${err.message}`));



app.use(express.json())
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsConfig));
app.use(cookieParser());

app.get('/', (req, res) => {
    return res.sendFile(__dirname + '/index.html')
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


app.use('/api/accounts', accountApis)
app.use('/api/user', userApis)
app.use('/api/teachers', teacherApis)
app.use('/api/carts', cartApis)
app.use('/api/categories', categoryApis)
app.use('/api/courses', courseApis)
app.use('/api/chapters', chapterApis)
app.use('/api/lessons', lessonApis)
app.use('/api/coupons', couponApis)
app.use('/api/login', loginApis)
app.use('/api/payment', paymentApis)
app.use('/api/chat', chatApis)
app.use('/api/invoices', invoiceApis)
app.use('/api/rate', rateApis)
app.use('/api/admin/users', adminUserApis)


module.exports = app