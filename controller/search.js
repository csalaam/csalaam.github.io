const User = require("../model/model")

exports.search = async (req, res) => {
    const q = req.query.q || ''
    const users = await User.find({
        name: { $regex: `.*^${q}.*`, $options: "i"}
    })
    res.render("cases", { users, q })
    console.log(users)
}
