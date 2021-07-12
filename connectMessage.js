module.exports = function connectMessage(channel, message_ts, url) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Please connect your account :point_down:',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Connect account',
            emoji: true,
          },
          style: 'primary',
          value: 'connect_account',
          action_id: 'actionId-0',
          url: `${process.env.UNFURL_DOMAIN}/login?channel=${channel}&message_ts=${message_ts}&url=${url}`,
        },
      ],
    },
  ];
};
