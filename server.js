require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const verifySignature = require('./verifySignature.js');
const app = express();
const router = require('./router.js');

// Verify signature in middleware for urlencoded or json requests
app.use(express.urlencoded({ extended: true, verify: verifySignature }));
app.use(express.json({ verify: verifySignature }));

// Add session middleware to routes
app.use(
  ['/private', '/login'],
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

// Let router handle requests
app.use('/', router);

// Redirect any unknown routes to log in
app.use(function (req, res) {
  res.redirect('/login');
});

app.listen(3000, () => {
  console.log('Server has started');
});
