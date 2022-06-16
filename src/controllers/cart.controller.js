const CartModel = require('../models/users/cart.model');
const CourseModel = require('../models/courses/course.model')
const helper = require('../helper/index');
const CodeModel = require('../models/code.model');
const MyCourseModel = require('../models/users/myCourse.model');




// fn: thêm khoá học vào giỏ hàng
const postCart = async (req, res, next) => {
    try {
        const { course } = req.body
        const { user } = req
        // kiểm tra khoá học
        const hadCourse = await CourseModel.findById(course).lean()
        if (!hadCourse) return res.status(400).json({ message: "mã khoá học không hợp lệ" })
        // kiểm tra đã mua chưa
        const isBuyed = await MyCourseModel.findOne({ user, course }).lean()
        if (isBuyed) return res.status(400).json({ message: "khoá học đã sỡ hữu" })
        // kiểm tra có trong giỏ chưa
        const inCart = await CartModel.findOne({ user: user._id, course }).lean()
        if (inCart) {
            return res.status(400).json({ message: "khoá học đã trong giỏ hàng" })
        }

        // thêm khoá học vào giỏ hàng
        await CartModel.create({ user: user._id, course })
        const carts = await CartModel.find({ user })

        res.status(201).json({ message: "oke", carts })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}


// fn: lấy thông tin giỏ hàng
const getCart = async (req, res, next) => {
    try {
        const { user } = req

        // lấy giỏ hàng
        const carts = await CartModel.find({ user, wishlist: false })
            .populate({
                path: 'course',
                populate: { path: "author", select: "_id fullName" },
                select: '_id name thumbnail author currentPrice category level wishlist'
            })
            .select("-__v -user")
            .lean()
        const result = await helper.hanlderCheckoutCarts(carts)
        const wishlist = await CartModel.find({ user, wishlist: true })
            .populate({
                path: 'course',
                populate: { path: "author", select: "_id fullName" },
                select: '_id name thumbnail author currentPrice category level wishlist'
            })
            .select("-__v -user")
            .lean()
        if (result.error) {
            return res.status(500).json({ message: error.message })
        }
        res.status(200).json({ message: "ok", numOfCarts: carts.length, totalPrice: result.totalPrice, totalDiscount: result.totalDiscount, estimatedPrice: result.estimatedPrice, carts: result.carts, wishlist })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}

// fn: cập nhật thông tin giỏ hàng (add coupon code)
const putCart = async (req, res, next) => {
    try {
        const { user } = req
        const { course } = req.params
        const { coupon, wishlist } = req.body

        // lấy giỏ hàng
        const carts = await CartModel.find({ user }).lean()

        // kiểm tra giỏ
        const hadCart = await CartModel.findOne({ user, course }).lean()
        if (!hadCart) return res.status(400).json({ message: "giỏ hàng không tồn tại" })
        if (wishlist) {
            await CartModel.updateOne({ user, course }, { wishlist })
            const newCarts = await CartModel.find({ user })
            return res.status(200).json({ message: 'oke', carts: newCarts })
        }
        if (coupon == "") {
            await CartModel.updateOne({ user, course }, { coupon })
            const newCarts = await CartModel.find({ user })
            return res.status(200).json({ message: 'oke', carts: newCarts })
        }
        // kiểm tra mã giảm giá
        const code = await CodeModel.findOne({ code: coupon }).populate('coupon').lean()
        if (!code) return res.status(400).json({ message: "mã giảm giá không tồn tại" })
        if (!code.isActive) return res.status(400).json({ message: "mã giảm giá đã sử dụng" })

        // kiểm tra mã có đang dùng không
        const isExisted = carts.some(cart => cart.coupon === coupon)
        if (isExisted) return res.status(400).json({ message: "mã giảm giá đã được áp dụng trong khoá học khác" })

        // lấy khoá học
        const c = await CourseModel.findById(course).lean()

        // kiểm tra mã giảm giá có áp dụng được cho khoá học này
        let result = helper.hanlderApplyDiscountCode(c, code)
        let message = result.message
        if (result.isApply) {
            await CartModel.updateOne({ _id: hadCart._id }, { coupon })
        }
        const newCarts = await CartModel.find({ user })
        res.status(200).json({ message, carts: newCarts })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}


// fn: loại bỏ khoá học khỏi giỏ hàng
const deleteCart = async (req, res, next) => {
    try {
        const { user } = req
        const { course } = req.params
        await CartModel.deleteOne({ user, course })
        const carts = await CartModel.find({ user })
        res.status(200).json({ message: "remove ok", carts })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}


module.exports = {
    postCart,
    getCart,
    putCart,
    deleteCart,
}