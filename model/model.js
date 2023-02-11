const { default: mongoose } = require("mongoose")
const bcrypt = require('bcrypt')

mongoose.connect(process.env.URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

var db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.on('disconnected', () => {
    console.log('MongoDB Disconnected')
})
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
        usernameField: 'email'
    },
    password: {
        type: String,
        required: true
    },
    joined: { 
        type: Date, 
        default: Date.now 
    },
    viewersentiment: { 
        type: Number, 
        default: 0,
    },
    hourswatched: {
        type: Number, 
        default: 0,
    },
    viewercontribution: {
        type: Number, 
        default: 0,
    },
    resolutions: {
        type: Number,
        default: 0,
    },
    resolutionrate: {
        type: Number,
        default: 0,
    },
    avgviewershipsentiment: {
        type: Number,
        default: 0,
    }
})

User.methods.isSamePassword = function(password) {
    return bcrypt.compareSync(password, this.password);
  };

User.index({ name: "text"})
module.exports = mongoose.model('User', User)