module.exports = (app, myDataBase, passport, bcrypt) => {
    const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
  });

  app.route('/').get((req, res) => {
    res.render('index', {title: 'Connected to Database', message: 'Please login', showLogin: true, showRegistration: true, showSocialAuth: true})
  });

  app.post('/login', passport.authenticate('local', {failureRedirect: '/' }), (req, res) => {
    res.redirect('profile')
  })

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  };

  app.get('/profile', ensureAuthenticated, (req, res) => {
    res.render('profile', {username: req.user.username})
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.route('/register').post((req, res, next) => {
    myDataBase.findOne({username: req.body.username}, (err, user) => {
      if(!err && user) {
        res.redirect('/')
      }
    })
    let hash = bcrypt.hashSync(req.body.password, 12)
    myDataBase.insertOne(
      {
        username: req.body.username,
        password: hash
      }, (err, newUser) => {
        if(!err && newUser) {
          next()
        }
      })
  }, passport.authenticate('/local', { failureRedirect: '/'}), (req, res) => {
    res.redirect('/profile')
  })

  app.get('/auth/github', passport.authenticate('github'))

  app.get('/auth/github/callback', passport.authenticate('github', {failureRedirect: '/'}), (req, res) => {
    res.redirect('/profile')
  })

  app.use((req, res, next) => {
    res.status(404)
    .type('text')
    .send('Not Found')
  })
}