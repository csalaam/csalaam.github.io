if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const app = express();
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const path = require('path')
const bodyParser = require('body-parser')
const User = require('./model/model')
const mongoose = require('mongoose')
const searchControl = require('./controller/search')
const updateControl = require('./controller/update')
console.log(mongoose.connection.readyState)

const initializePassport = require('./passport-config');
initializePassport(
    passport,
    email => User.findOne({ email: email }).exec(),
    id => User.findById(id)
    )

app.use(express.json())

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', (req, res) => {
    res.render('index.ejs')
})

app.get('/home', checkAuthenticated, (req, res) => {
    res.render('index_acc.ejs', { name: req.user.name })
})

app.get('/support', (req, res) => {
    res.render('support.ejs')
})

app.get('/account', (req, res) => {
    res.render('account.ejs')
})

app.get('/changePass', (req, res) => {
    res.render("changePass.ejs", {message: ''})
})

app.post('/changePass', updateControl.update)

app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', notAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        })
        await user.save()
        res.redirect('/login')
    } catch(err) {
        console.log(err)
        res.redirect('/register')
    }
})


app.get('/login', (req, res) => {
    res.render('login.ejs')
})

app.post('/login', notAuthenticated, passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/cases', searchControl.search)

app.get('/logout', (req, res) => {
    req.logout((err)=>{
        if(err) {
            return res.status(500).send({error: 'Error while logging out'})
        }
        res.redirect('/')
    })
})

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}

function notAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
       return res.redirect('/')
    }
    next()
}

app.listen(3001)