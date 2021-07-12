require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const verifySignature = require('./verifySignature.js');
const { getAccessToken, chatPostEphemeral, deletePostEphemeral } = require('./slack-api');
const createMessage = require('./createMessage');
const unfurlImage = require('./unfurlImage');

const app = express();

// Verify signature in middleware for urlencoded or json requests
app.use(express.urlencoded({ extended: true, verify: verifySignature }));
app.use(express.json({ verify: verifySignature }));
app.use(express.static('public'));

app.use(
  ['/slack-img', '/login'],
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

// Not saving to DB, state reset on server restart
const AUTHED_USERS = new Set();

app.post('/slack/events', async (req, res) => {
  // Verify request signature is valid
  if (!req.valid) {
    return res.sendStatus(404);
  }

  // Verify URL challenge from events config
  if (req.body.challenge) {
    return res.send({ challenge: req.body.challenge });
  }

  // Acknowledge event
  res.sendStatus(200);

  if (req.body.event && req.body.event.type === 'link_shared') {
    const channel = req.body.event.channel;
    const user = req.body.event.user;
    const message_ts = req.body.event.message_ts;
    const url = req.body.event.links[0].url;

    const authedUser = AUTHED_USERS.has(user);

    if (!authedUser) {
      console.log('Not Authed');
      const response = await chatPostEphemeral(channel, user, createMessage(channel, message_ts, url));
      console.log(response.body);
      return;
    }

    unfurlImage(url, channel, message_ts);
  }
});

app.post('/slack/interactivity', (req, res) => {
  if (!req.valid) {
    return res.sendStatus(404);
  }
  res.sendStatus(200);

  const body = JSON.parse(req.body.payload);

  // Deleting ephemeral message to make more tidy (this will happen regardless of whether they auth or not)
  deletePostEphemeral(body.response_url);
});

// Sign in with slack
app.get('/login', async (req, res) => {
  let state = {};

  // If the login came from Slack, we add state so that an unfurl will happen after authorization
  if (req.query.url && req.query.channel && req.query.message_ts) {
    state = {
      ip_address: req.headers['x-forwarded-for'],
      url: req.query.url,
      channel: req.query.channel,
      message_ts: req.query.message_ts,
    };
  } else {
    state = { ip_address: req.headers['x-forwarded-for'] };
  }

  state = encodeURIComponent(JSON.stringify(state));

  res.send(
    `<a href="https://slack.com/oauth/v2/authorize?user_scope=identity.basic&client_id=${process.env.CLIENT_ID}&state=${state}&redirect_uri=https://richardsgottatest.au.ngrok.io/login/oauth_redirect"><img src="https://api.slack.com/img/sign_in_with_slack.png" /></a>`
  );
});

// Redirect after authorization
app.get('/login/oauth_redirect', async (req, res) => {
  const state = JSON.parse(decodeURIComponent(req.query.state));

  // Check for access code and IP address match initial request
  if (req.query.code && state.ip_address === req.headers['x-forwarded-for']) {
    // Send the code to ask for an access token for user
    req.session.user = await getAccessToken(req.query.code);

    // Store user (global var – will be cleared on server close)
    // Should store to DB but not purpose of this app
    AUTHED_USERS.add(req.session.user);

    // Unfurl image in Slack if user initially shared a link and redirect them back
    if (state.url) {
      unfurlImage(state.url, state.channel, state.message_ts);
      res.redirect(`https://slack.com/app_redirect?channel=${state.channel}`);
      return;
    }
    // Redirect user to the private resource
    res.redirect('/slack-img');
    return;
  }
  res.sendStatus(404);
});

// Private resource, needs to have authorized Slack
app.get('/slack-img', async (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  res.send(
    `<img style="display: block; width:50%; margin-top: 200px; margin-left:auto; margin-right:auto" src="/slack-img/slack.jpg">
    <h1>Confidential text</h1>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    `
  );
});

app.get('/slack-img/slack.jpg', (req, res) => {
  if (req.session && req.session.user) {
    res.sendFile(path.join(__dirname, './private/slack.jpg'), function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log('Sent file');
      }
    });
  } else {
    res.sendStatus(404);
  }
});

app.listen(3000, () => {
  console.log('Server has started');
});
