const User = require("../model/model")
const bcrypt = require('bcrypt')

exports.update = async (req, res) => {
    message = ''
    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) return res.render("changePass", { message: 'Error finding user'})
        if (!user) return res.render("changePass", { message: 'No user found'})


        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

        if (!passwordRegex.test(req.body.newPassword)) {
        return res.render("changePass", { message: "Password must have at least 8 characters, one uppercase, one lowercase, one number and one special character ($, !, @, *, %, &, and ,)" })
        }

        if (user.isSamePassword(req.body.newPassword)) {
            return res.render("changePass", {
                message: "New password must be different than old password"
            })
        }

        bcrypt.genSalt(10, (err, salt) => {
            if (err) return res.render("changePass", { message: 'Error generating salt' })

            bcrypt.hash(req.body.newPassword, salt, (err, hash) => {
                if (err) return res.render("changePass", { message: "Error hashing password" })

            user.password = hash
            user.save((err) => {
                if (err) return res.render("changePass", { message: 'Error saving new password'})
                res.render("changePass", { message: "Password updated successfully"})
                })
            })
        })
    })
}
