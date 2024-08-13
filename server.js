'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

let session = require('express-session')
let passport = require('passport')
let ObjectId = require('mongodb')
let LocalStrategy = require('passport-local');
let bcrypt = require('bcrypt')
let auth = require('./auth')
let routes = require('./routes')
let passportSocketIo = require('passport.socketio')
let cookieParser = require('cookie-parser')

const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();

let http = require('http').createServer(app)
let io = require('socket.io')(http)

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'pug')

app.set('views', './views/pug')

myDB(async client => {
  const myDataBase = await client.db('database').collection('users')

  auth(app, myDataBase, session, passport, ObjectId, LocalStrategy, bcrypt)
  routes(app, myDataBase, passport, bcrypt)
  const PORT = process.env.PORT || 3000;
  http.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
  });

  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );

  function onAuthorizeSuccess(data, accept) {
    console.log('successful connection to socket.io');
  
    accept(null, true);
  }
  
  function onAuthorizeFail(data, message, error, accept) {
    if (error) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    accept(null, false);
  }

  let currentUsers = 0;

  io.on('connection', socket => {
    console.log('user ' + socket.request.user.name + ' connected')
    ++currentUsers

    // io.emit('user count', currentUsers)

    io.emit('user', {
      username: socket.request.user.name,
      currentUsers,
      connected: true
    });

    socket.on('chat message', message => {
      io.emit('chat message', {username: socket.request.user.name, message: message})
    })

    socket.on('disconnect', () => {
      --currentUsers
      // io.emit('user count', currentUsers)
      
      io.emit('user', {
        username: socket.request.user.name,
        currentUsers,
        connected: false
      });
    })
  })
})
  .catch(e => {
    app.route('/').get((req, res) => {
      res.render('index', { title: e, message: 'Unable to connect to database' });
    });
  
})
