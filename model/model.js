const { default: mongoose } = require("mongoose")

mongoose.connect(process.env.URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

var db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function() {
    console.log('connected')
})

const User = new mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true,
        usernameField: 'emails'
    },
    password: {
        type: String,
        required: true
    },
    joined: { type: Date, default: Date.now },
})
module.exports = mongoose.model('User', User)