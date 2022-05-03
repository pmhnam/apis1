var express = require('express');
var paymentApis = express.Router();
const paymentController = require('../controllers/payment/index.controller')

// api: checkout thông tin giá khoá học ước tính
paymentApis.post('/checkout-cart', paymentController.postCheckoutCart)

// api: checkout thông tin trước thanh toán
paymentApis.post('/checkout', paymentController.postPaymentCheckout)

// api: thông tin sau khi thanh toán
paymentApis.get('/:gateway/callback', paymentController.getPaymentCallback)

module.exports = paymentApis;
