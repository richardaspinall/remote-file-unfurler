const path = require('path');
const express = require('express');

const { getAccessToken, chatPostEphemeral, deletePostEphemeral } = require('./slack-api');
const connectMessage = require('./connectMessage');
const unfurlFile = require('./unfurlFile');

const router = express.Router();

// Not saving to DB, state reset on server restart
const AUTHED_USERS = new Set();

// Events API handler
router.post('/slack/events', async (req, res) => {
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

  // Check for `link_shared` event
  if (req.body.event && req.body.event.type === 'link_shared') {
    // Get event context
    const channel = req.body.event.channel;
    const user = req.body.event.user;
    const message_ts = req.body.event.message_ts;
    const url = req.body.event.links[0].url;

    if (!AUTHED_USERS.has(user)) {
      // Post connect message to user to auth
      chatPostEphemeral(channel, user, connectMessage(channel, message_ts, url));
      return;
    }

    unfurlFile(channel, message_ts, url);
  } else {
    // Some other event being sent from your app!
    console.log(req.body);
  }
});

// Acknowledge interactions
router.post('/slack/interactivity', (req, res) => {
  if (!req.valid) {
    return res.sendStatus(404);
  }
  res.sendStatus(200);

  const body = JSON.parse(req.body.payload);

  // Delete ephemeral message

  deletePostEphemeral(body.response_url);
});

// Sign in with slack
router.get('/login', async (req, res) => {
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
    `<a href="https://slack.com/oauth/v2/authorize?user_scope=identity.basic&client_id=${process.env.CLIENT_ID}&state=${state}&redirect_uri=${process.env.UNFURL_DOMAIN}/login/oauth_redirect"><img src="https://api.slack.com/img/sign_in_with_slack.png" /></a>`
  );
});

// Redirect
router.get('/login/oauth_redirect', async (req, res) => {
  const state = JSON.parse(decodeURIComponent(req.query.state));

  // Check for access code and IP address match initial request
  if (req.query.code && state.ip_address === req.headers['x-forwarded-for']) {
    // Request access from Slack
    req.session.user = await getAccessToken(req.query.code);

    // Add user to authorized users
    AUTHED_USERS.add(req.session.user);

    // Unfurl image on the initial shared message
    if (state.url) {
      unfurlFile(state.channel, state.message_ts, state.url);
      // Redirect them back to slack
      res.redirect(`https://slack.com/app_redirect?channel=${state.channel}`);
      return;
    }

    // Redirect user to the private resource when not coming from Slack
    res.redirect('/private');
    return;
  }
  res.sendStatus(404);
});

// Private page
router.get('/private', async (req, res) => {
  // Redirect user to login
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  // Send our private resource
  res.sendFile(path.join(__dirname, './private/index.html'), function (err) {
    if (err) {
      console.log(err);
    }
  });
});

// Private image
router.get('/private/slack.jpg', (req, res) => {
  if (req.session && req.session.user) {
    res.sendFile(path.join(__dirname, './private/slack.jpg'), function (err) {
      if (err) {
        console.log(err);
      }
    });
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;
