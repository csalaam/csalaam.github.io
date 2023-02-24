const localStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const User = require('./model/model')

function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
        const user = await User.findOne({ email: email })
        if (!user) {
            return done(null, false, {message: 'No user with that email'})
        }

        if (!user.admin && user.passcode !== 'hi'){
            return done(null, false, {message: 'You are not an admin'})
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user)
            } else {
                return done(null, false, {message: 'Password incorrect'})
            }
        } catch (e) {
            return done(e)
        }
    }

    passport.use(new localStrategy({ usernameField: 'email'}, authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser( async (id, done) => {
        const user = await User.findById(id)
        return done(null, user)
      })
}

module.exports = initialize