const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var bcrypt = require('bcryptjs')

const accountSchema = new Schema({
    // username: { type: String, unique: true, required: true, trim: true },
    email: { type: String, unique: true, required: true, trim: true },
    password: { type: String, required: true, trim: true },
    role: {
        type: String,
        enum: ["student", "teacher", "admin"],
        default: "student",
    },
    refreshToken: {
        type: String,
        default: null,
    },
    accessToken: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true,
    }
});

// hash password with bcrypt 
// Note: callback should be a nomal function -> use "this"

accountSchema.pre('save', async function (next) {
    try {
        const saltRounds = parseInt(process.env.SALT_ROUND)
        // Hashing password...
        const hashPassword = await bcrypt.hash(this.password, saltRounds)
        this.password = hashPassword
        next()
    } catch (error) {
        next(error)
    }
})

const AccountModel = mongoose.model('account', accountSchema, 'accounts');

module.exports = AccountModel;
