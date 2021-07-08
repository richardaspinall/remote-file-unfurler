require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const verifySignature = require('./verifySignature.js');
const { filesRemoteAdd, chatUnfurl, getAccessToken } = require('./slack-api');

const app = express();

// Verify signature in middleware for urlencoded or json requests
app.use(express.urlencoded({ extended: true, verify: verifySignature }));
app.use(express.json({ verify: verifySignature }));
app.use(express.static('public'));

app.use(
  ['/slack-img', '/private-resource'],
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

// Resource URL
const RESOURCE_URL = `${process.env.UNFURL_DOMAIN}/slack-img`;

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
  const message_ts = req.body.event.message_ts;

  // TODO: add identity check in Slack

  // Check URL in message matches the resource URL
  if (req.body.event.links[0].url === RESOURCE_URL) {
    try {
      // Add preview image to Slack
      const response = await filesRemoteAdd(
        path.join(__dirname, './public/slack.jpg'),
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
});

app.get('/slack-img', async (req, res) => {
  if (req.query.code) {
    // Send the code and res off to ask for an access token and display it back on redirect
    req.session.user = await getAccessToken(req.query.code);
    res.redirect('/slack-img');
    return;
  } else if (!req.session.user) {
    res.send(
      `<a href="https://slack.com/oauth/v2/authorize?user_scope=identity.basic&client_id=${process.env.CLIENT_ID}&redirect_uri=https://richardsgottatest.au.ngrok.io/slack-img"><img src="https://api.slack.com/img/sign_in_with_slack.png" /></a>`
    );
  }
  if (req.session.user) {
    console.log(req.session);
    res.send(`<img style="display: block; width:50%; margin-left:auto; margin-right:auto" src="/private-resource">`);
  }
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
