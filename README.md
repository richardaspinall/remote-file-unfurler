# remote-file-unfurler

> Started: 8 July 2021

> Ended: 12 July 2021

## Description
Displays a file preview (hardcoded) when a link is shared by an authed user. This is roughly implementing the remote files API outlined here: https://api.slack.com/messaging/files/remote

## Install

1. Load `manifest.json` and replace `UNFURL_DOMAIN` with your own public URL
2. Create the following enviornment variables populating from the Slack app configuration page:
   - BOT_TOKEN
   - SIGNING_SECRET
   - CLIENT_ID
   - CLIENT_SECRET
   - SESSION_SECRET // Create a secret key (can be any string and doesn't matter much for testing purposes)
   - UNFURL_DOMAIN (your public URL for hosting this service)
3. Clone and run `npm install`

## Usage

1. Add bot to channel
2. Send the following link `UNFURL_DOMAIN/private`
3. Connect your test account through the ephemeral message
4. Redirect back to Slack and see the unfurl of the image
5. Click on the link in channel to see the private page
