require('dotenv').config();
let GitHubStrategy = require('passport-github').Strategy

module.exports = (app, myDataBase, session, passport, ObjectId, LocalStrategy, bcrypt) => {
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: { secure: false }
      }))
      
      app.use(passport.initialize())
      app.use(passport.session())

      passport.serializeUser((user, done) => {
        done(null, user._id)
      })
      
      passport.deserializeUser((id, done) => {
        myDataBase.findOne({
          _id: new ObjectId(id)},
          (err, doc) => {
            done(null, doc)
        })
      })

      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: 'http://localhost:3000/auth/github/callback'
      },
        (accessToken, refreshToken, profile, cb) => {
            console.log(profile)
            myDataBase.findOneAndUpdate(
                {id: profile.id},
                {
                    $setOnInsert: {
                        id: profile.id,
                        username: profile.username,
                        name: profile.displayName || 'John Doe',
                        photo: profile.photos[0].value || '',
                        email: Array.isArray(profile.emails)
                          ? profile.emails[0].value
                          : 'No public email',
                        created_on: new Date(),
                        provider: profile.provider || ''
                      },
                        $set: {
                            last_login: new Date()
                      },
                        $inc: {
                        login_count: 1
                      }
                },
                { upsert: true, new: true },
                (err, doc) => {
                    if(!err && doc)
                        return cb(null, doc.value);
                }
            )
        }
      ))

      passport.use(new LocalStrategy((username, password, done) => {
        myDataBase.findOne({username: username}, (err, user) => {
          console.log(`User ${username} attempted to log in.`);
          if(err) {
            return done(err)
          }
          else if(!user) {
            return done(null,false)
          }
          else if(!bcrypt.compareSync(password, user.password)) {
            return done(null, false)
          }
          else {
            return done(null, user)
          }
        })
      }))
}