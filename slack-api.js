const request = require('superagent');

async function filesRemoteAdd(preview_image, title, external_url, external_id) {
  const httpHeaders = {
    Authorization: `Bearer ${process.env.BOT_TOKEN}`,
  };
  const response = await request
    .post('https://slack.com/api/files.remote.add')
    .set(httpHeaders)
    .attach('preview_image', preview_image)
    .field('title', title)
    .field('external_url', external_url)
    .field('external_id', external_id);

  return response;
}

async function chatUnfurl(ts, channel, unfurls) {
  const httpHeaders = {
    'Content-type': 'application/json; charset=utf-8',
    Authorization: `Bearer ${process.env.BOT_TOKEN}`,
  };
  const response = await request.post('https://slack.com/api/chat.unfurl').set(httpHeaders).send({
    ts: ts,
    channel: channel,
    unfurls: unfurls,
  });
  return response;
}

async function getAccessToken(code) {
  try {
    const response = await request
      .post('https://slack.com/api/oauth.v2.access')
      .type('application/x-www-form-urlencoded')
      .send({
        code: code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: 'https://richardsgottatest.au.ngrok.io/login/oauth_redirect', // Must match if we send one from `/slack/install/`. If we don't then the app config page will automatically redirect
      });
    console.log(response.body);
    return response.body.authed_user.id;
  } catch (err) {
    console.log(err);
  }
}

async function chatPostEphemeral(channel, user, message) {
  const httpHeaders = {
    'Content-type': 'application/json; charset=utf-8',
    Authorization: `Bearer ${process.env.BOT_TOKEN}`,
  };
  const response = await request.post('https://slack.com/api/chat.postEphemeral').set(httpHeaders).send({
    channel: channel,
    user: user,
    blocks: message,
  });
  return response;
}

module.exports = {
  filesRemoteAdd,
  chatUnfurl,
  getAccessToken,
  chatPostEphemeral,
};
