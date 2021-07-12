const request = require('superagent');

async function filesRemoteAdd(preview_image, title, external_url, external_id) {
  const httpHeaders = {
    Authorization: `Bearer ${process.env.BOT_TOKEN}`,
  };
  try {
    const response = await request
      .post('https://slack.com/api/files.remote.add')
      .set(httpHeaders)
      .attach('preview_image', preview_image)
      .field('title', title)
      .field('external_url', external_url)
      .field('external_id', external_id);
    if (!response.body.ok) {
      throw response.body;
    }
    return response;
  } catch (error) {
    console.log(error);
  }
}

async function chatUnfurl(ts, channel, unfurls) {
  const httpHeaders = {
    'Content-type': 'application/json; charset=utf-8',
    Authorization: `Bearer ${process.env.BOT_TOKEN}`,
  };
  try {
    const response = await request.post('https://slack.com/api/chat.unfurl').set(httpHeaders).send({
      ts: ts,
      channel: channel,
      unfurls: unfurls,
    });
    if (!response.body.ok) {
      throw response.body;
    }
    return response;
  } catch (error) {
    console.log(error);
  }
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
        redirect_uri: 'https://richardsgottatest.au.ngrok.io/login/oauth_redirect',
      });
    if (!response.body.ok) {
      throw response.body;
    }
    return response.body.authed_user.id;
  } catch (error) {
    console.log(error);
  }
}

async function chatPostEphemeral(channel, user, message) {
  const httpHeaders = {
    'Content-type': 'application/json; charset=utf-8',
    Authorization: `Bearer ${process.env.BOT_TOKEN}`,
  };
  try {
    const response = await request.post('https://slack.com/api/chat.postEphemeral').set(httpHeaders).send({
      channel: channel,
      user: user,
      blocks: message,
    });

    if (!response.body.ok) {
      throw response.body;
    }
    return response;
  } catch (error) {
    console.log(error);
  }
}

async function deletePostEphemeral(url) {
  const httpHeaders = {
    'Content-type': 'application/json; charset=utf-8',
  };
  try {
    const response = await request.post(url).set(httpHeaders).send({
      delete_original: 'true',
    });
    if (!response.body.ok) {
      throw response.body;
    }
    return response;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  filesRemoteAdd,
  chatUnfurl,
  getAccessToken,
  chatPostEphemeral,
  deletePostEphemeral,
};
