require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const verifySignature = require('./verifySignature.js');
const { filesRemoteAdd, chatUnfurl, getAccessToken, chatPostEphemeral } = require('./slack-api');
const createMessage = require('./createMessage');

const app = express();

// Verify signature in middleware for urlencoded or json requests
app.use(express.urlencoded({ extended: true, verify: verifySignature }));
app.use(express.json({ verify: verifySignature }));
app.use(express.static('public'));

app.use(
  ['/slack-img', '/private-resource', '/authenticate'],
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

// Resource URL
const RESOURCE_URL = `${process.env.UNFURL_DOMAIN}/slack-img`;

const AUTHED_USERS = [''];

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

  const channel = req.body.event.channel;
  const user = req.body.event.user;
  const message_ts = req.body.event.message_ts;
  const url = req.body.event.links[0].url;

  const authedUser = AUTHED_USERS.find(function (userToFind) {
    return userToFind === user;
  });

  if (!authedUser) {
    console.log('Not Authed');
    const response = await chatPostEphemeral(channel, user, createMessage(channel, message_ts, url));
    console.log(response.body);
    return;
  }

  unfurlImage(url, channel, message_ts);
});

app.get('/authenticate', async (req, res) => {
  let state = {};
  if (req.query.url && req.query.channel && req.query.message_ts) {
    state = encodeURIComponent(
      JSON.stringify({ url: req.query.url, channel: req.query.channel, message_ts: req.query.message_ts })
    );
  }

  if (req.query.code) {
    // Send the code to ask for an access token and display it back on redirect
    req.session.user = await getAccessToken(req.query.code);
    AUTHED_USERS.push(req.session.user);
    // TODO: if state includes message_ts, channel and url, unfurl image

    state = JSON.parse(decodeURIComponent(req.query.state));
    if (state.channel) {
      unfurlImage(state.url, state.channel, state.message_ts);
    }
    res.redirect('/slack-img');
    return;
  }
  res.send(
    `<a href="https://slack.com/oauth/v2/authorize?user_scope=identity.basic&client_id=${process.env.CLIENT_ID}&state=${state}&redirect_uri=https://richardsgottatest.au.ngrok.io/authenticate"><img src="https://api.slack.com/img/sign_in_with_slack.png" /></a>`
  );
});

app.get('/slack-img', async (req, res) => {
  if (!req.session.user) {
    res.redirect('/authenticate');
    return;
  }
  res.send(`<img style="display: block; width:50%; margin-left:auto; margin-right:auto" src="/private-resource">`);
});

app.get('/private-resource', (req, res) => {
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

async function unfurlImage(url, channel, message_ts) {
  if (url === RESOURCE_URL) {
    try {
      // Add preview image to Slack
      const response = await filesRemoteAdd(
        path.join(__dirname, './private/slack.jpg'),
        'Slack Logo',
        RESOURCE_URL,
        'ABC123456789'
      );

      if (response.body.ok) {
        // Unfurl preview image
        chatUnfurl(message_ts, channel, {
          [RESOURCE_URL]: {
            blocks: [
              {
                type: 'file',
                external_id: 'ABC123456789',
                source: 'remote',
              },
            ],
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
}
