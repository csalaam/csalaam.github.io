if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}


const express = require('express')
const app = express();
const cors = require('cors')
const bcrypt = require('bcrypt')
const passport = require('passport')
const localStrategy = require('passport-local').Strategy
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const path = require('path')
const bodyParser = require('body-parser')
const User = require('./model/model')
const mongoose = require('mongoose')
const searchControl = require('./controller/search')
const updateControl = require('./controller/update')
const server = require('http').Server(app)
const io = require('socket.io')(server)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

const localStrategyAdmin = new localStrategy({ usernameField: 'email' }, async (email, password, done) => {
    const user = await User.findOne({ email: email })
    if (!user) {
        return done(null, false, {message: 'No user with that email'})
    }

    if (!user.admin || user.passcode !== 'hi') {
        return done(null, false, {message: 'You are not an admin'})
    }

    if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
    } else {
        return done(null, false, {message: 'Password incorrect'})
    }
    
})

const localStrategyRegular = new localStrategy({ usernameField: 'email' }, async (email, password, done) => {
    const user = await User.findOne({ email: email })
    if (!user) {
        return done(null, false, {message: 'No user with that email'})
    }

    if (user.adminAtmpt) {
        return done(null, false, {message: 'You are not an admin'})
    }

    if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
    } else {
        return done(null, false, {message: 'Password incorrect'})
    }
})

console.log(mongoose.connection.readyState)

app.use(express.json())
app.use('/socket.io', (req, res, next) => {
    res.setHeader('Content-Type', 'application/javascript');
    next();
  });
  
  // Serve the socket.io.js file
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));
app.use(cors())

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
    done(null, user.id)
  })
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id)
      done(null, user)
    } catch (error) {
      done(error, null)
    }
  })
app.use(methodOverride('_method'))

passport.use('admin', localStrategyAdmin)
passport.use('regular', localStrategyRegular)

const rooms = { }

app.get('/register', notAuthenticated, (req, res) => {
    let message
    res.render('register.ejs', {message})
})

app.post('/register', notAuthenticated, async (req, res) => {
    try {
        if (!passwordRegex.test(req.body.password)) {
            message = "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character."
            res.render('register', {message})
        } else {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        })
        await user.save()
        res.redirect('/login')
        }
    } catch(err) {
        console.log(err)
    }
})

app.get('/login', notAuthenticated, (req, res) => {
    res.render('login.ejs')
})

app.post('/login', notAuthenticated, passport.authenticate('regular', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
})) 

app.get('/register_admin', notAuthenticated, (req, res) => {
    let message
    res.render('register_admin.ejs', {message})
})


app.post('/register_admin', notAuthenticated, async (req, res) => {
    try {
        if (!passwordRegex.test(req.body.password) || (req.body.passcode !== 'hi')) {
            message = "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character. Or wrong passcode."
            res.render('register_admin', {message})
        } else {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            passcode: req.body.passcode,
            admin: true,
            adminAtmpt: true,
        })
        await user.save()
        res.redirect('/login_admin')
        }
    } catch(err) {
        console.log(err)
    }
})

app.get('/login_admin', notAuthenticated, (req, res) => {
    res.render('admin_login.ejs')
})

app.post('/login_admin', notAuthenticated, passport.authenticate('admin', {
    successRedirect: '/admin',
    failureRedirect: '/login_admin',
    failureFlash: true
}))

app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs')
})

app.get('/home', checkAuthenticated, (req, res) => {
    res.render('index_acc.ejs', { name: req.user.name })
})

app.get('/home/rooms', (req, res) => {
    res.render('joinRoom', { rooms: rooms, name: req.user.name })
})

app.post('/home/room', checkAuthenticated, (req, res) => {
    if (rooms[req.body.room] != null) {
        return res.redirect('/home')
    }

    rooms[req.body.room] = { users: {} }
    res.redirect(req.body.room)
    io.emit('room-created', req.body.room)
}) 

app.get('/home/:room', checkAuthenticated, (req, res) => {
    if (rooms[req.params.room] == null) {
        return res.redirect('/home')
    }
    res.render('room', { roomName: req.params.room, name : req.user.name })
})

function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
        if (room.users[socket.id] != null) names.push(name)
        return names
    }, [])
}

app.get('/support', checkAuthenticated, (req, res) => {
    res.render('support.ejs')
})

app.get('/account', checkAuthenticated, (req, res) => {
    res.render('account.ejs')
})

app.get('/admin/account', checkAuthenticated, (req, res) => {
    res.render('admin_account.ejs')
})

app.get('/admin/changePass', checkAuthenticated, (req, res) => {
    res.render('admin_change.ejs', {message: '', email: req.user.email})
})

app.get('/cases', checkAuthenticated, searchControl.search)

app.get('/changePass', checkAuthenticated, (req, res) => {
    res.render("changePass.ejs", {message: ''})
})

app.post('/changePass', checkAuthenticated, updateControl.update)


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
        res.redirect('/login')
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
       return res.redirect('/home')
    }
    return next()
}

server.listen(3001)

io.on('connection', socket => {
    socket.on('new-user', (room, name) => {
        socket.join(room)
        rooms[room].users[socket.id] = name
        socket.to(room).emit('user-connected', name)
    })
    socket.on('send-chat-message', (room, message) => {
        socket.to(room).emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
    })
    socket.on('disconnect', () => {
        getUserRooms(socket).forEach(room => {
            socket.to(room).emit('user-disconnected', rooms[room].users[socket.id])
            delete rooms[room].users[socket.id]
        })
    })
})