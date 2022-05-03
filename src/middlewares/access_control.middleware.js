const MyCourseModel = require('../models/users/myCourse.model');
const ac = require('../configs/role.config');


const grantAccess = function (action, resource) {
    return async (req, res, next) => {
        try {
            const account = req.account
            console.log(account);
            const permission = ac.can(account.role)[action](resource)
            console.log(permission.granted);
            console.log(permission1.granted);
            if (!permission.granted) {
                return res.status(401).json({ message: "Unauthorized" })
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}




module.exports = {
    grantAccess,
}
