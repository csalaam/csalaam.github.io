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
const crudControl = require('./controller/crud')
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

app.get('/admin/account', checkAuthenticated, (req, res) => {
    res.render('admin_account.ejs')
})

app.get('/admin/changePass', checkAuthenticated, (req, res) => {
    res.render('admin_change.ejs', {message: '', email: req.user.email})
})

app.get('/cases', searchControl.search)

app.get('/changePass', (req, res) => {
    res.render("changePass.ejs", {message: ''})
})

app.post('/changePass', checkAuthenticated, updateControl.update)

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

app.get('/register_admin', (req, res) => {
    res.render('register_admin.ejs')
})


app.post('/register_admin', notAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            passcode: req.body.passcode,
            admin: true
        })
        await user.save()
        res.redirect('/login_admin')
    } catch(err) {
        console.log(err)
        res.redirect('/register_admin')
    }
})

app.get('/login_admin', (req, res) => {
    res.render('admin_login.ejs')
})

app.post('/login_admin', notAuthenticated, passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login_admin',
    failureFlash: true
}))

app.get('/admin', checkAuthenticated, async (req, res) => {
    console.log('req.session.user',req.user)
    try {
        const users = await User.find({_id: {$ne: req.user._id}})
        res.render('admin', { users, err: '' })
    } catch (err) { 
        console.log(err)
        res.render('admin', { err: 'Error loading users'})
    }
})

app.get('/admin/search', checkAuthenticated, async (req, res) => {
    const q = req.query.q || ''
    const users = await User.find({
        name: { $regex: `.*^${q}.*`, $options: "i"}
    })
    res.render("admin_search", { users, q })
})

app.get('/admin/settings', checkAuthenticated, (req, res) => {
    res.render('admin_account.ejs')
})

app.get('/edit/:userId', checkAuthenticated, async (req, res) => {
    const requestUserId = req.params.userId
    try {
        const foundUser = await User.findById(requestUserId);
        if (foundUser) {
          res.render('edit', { user: foundUser, err: null });
        } else {
          res.render('edit', { user: null, err: 'User not found' });
        }
      } catch (err) {
        if (err instanceof mongoose.CastError) {
          res.render('edit', { user: null, err: 'Action Already Satisfied' });
        } else {
          console.error(err);
          res.status(500).send('Internal server error');
        }
      }
    });

app.post('/edit/:userId', checkAuthenticated, async (req, res) => {
    const users = await User.find({_id: {$ne: req.user._id}})
    const requestedUserId = req.params.userId
    const newAdmin = req.body.admin
    User.findByIdAndUpdate(requestedUserId, {admin: newAdmin}, function(err, foundUser) {
        if (err) {
            err = 'Error updating user'

            res.redirect('/edit/:userId')
        } else {
            res.redirect('/admin')
        }
    })
})

app.post('/delete/:userId', checkAuthenticated, async (req, res) => {
    const requestedUserId = req.params.userId
    User.findByIdAndRemove(requestedUserId, function(err) {
        if (err) {
            console.log(err)
        } else {
            res.redirect('/admin')
        }
    })
})

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