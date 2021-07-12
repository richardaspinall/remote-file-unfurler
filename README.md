# slack-unfurl-remote-breakdown

Slack tester app that displays a file preview when a link is shared by authed user

Roughly implementing the remote files API here
https://api.slack.com/messaging/files/remote

# Install

1. Load `manifest.json` and replace `UNFURL_DOMAIN` with your own public URL
2. Create enviornment variables:
   - BOT_TOKEN
   - SIGNING_SECRET
   - CLIENT_ID
   - CLIENT_SECRET
   - SESSION_SECRET // Create a secret key (can be any string and doesn't matter much for testing purposes)
   - UNFURL_DOMAIN // Your public URL for serving pages and responding to Slack
3. Clone and run `npm install`

# Usage

1. Add bot to channel
2. Send the following link `UNFURL_DOMAIN/private` (your public URL)
3. Connect your test account through the ephemeral message
4. Redirect back to Slack and see the unfurl of the image
5. Click on the link in channel and see the full page
