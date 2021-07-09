const { filesRemoteAdd, chatUnfurl } = require('./slack-api');
const path = require('path');

const RESOURCE_URL = `${process.env.UNFURL_DOMAIN}/slack-img`;

module.exports = async function unfurlImage(url, channel, message_ts) {
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
};
