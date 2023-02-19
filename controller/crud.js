const User = require("../model/model")
const bcrypt = require('bcrypt')

exports.search = async (req, res) => {
    const q = req.query.q || ''
    const users = await User.find({
        name: { $regex: `.*^${q}.*`, $options: "i"}
    })
    res.render("admin", { users, q })
}
