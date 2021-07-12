const { filesRemoteAdd, chatUnfurl } = require('./slack-api');
const path = require('path');

const RESOURCE_URL = `${process.env.UNFURL_DOMAIN}/private`;

// Uploads a preview image and unfurls it
module.exports = async function unfurlFile(channel, message_ts, url) {
  if (url === RESOURCE_URL) {
    // Add remote file / preview image to Slack
    const response = await filesRemoteAdd(
      path.join(__dirname, './private/slack.jpg'),
      'Slack Logo',
      RESOURCE_URL,
      'ABC123456789'
    );
    if (response.body.ok) {
      // Unfurl preview image indicating account is connected
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
  }
};
