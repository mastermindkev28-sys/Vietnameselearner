/**
 * Setup helper — prints a Zalo OAuth URL so you can authorize your app
 * and discover your girlfriend's Zalo User ID (she must have followed your OA).
 *
 * Usage:
 *   1. node src/setup.js
 *   2. Open the printed URL in a browser, log in, and approve
 *   3. Zalo redirects to your callback URL — grab `code` from the query string
 *   4. Exchange code for access_token via Zalo OAuth API
 *   5. Paste access_token in .env
 *
 * To find her User ID:
 *   After setting access_token, she needs to send any message to your OA (Official Account).
 *   Her user_id will appear in the webhook event, or call the followers API below.
 */

require('dotenv').config();
const fetch = require('node-fetch');

const ACCESS_TOKEN = process.env.ZALO_ACCESS_TOKEN;

async function listFollowers() {
  if (!ACCESS_TOKEN || ACCESS_TOKEN === 'your_access_token_here') {
    console.log('=== ZALO REMINDER SETUP ===\n');
    console.log('Step 1: Create a Zalo Official Account (OA) at https://oa.zalo.me/');
    console.log('Step 2: Create a Zalo app at https://developers.zalo.me/');
    console.log('Step 3: Enable "Zalo Official Account API" for your app');
    console.log('Step 4: Get your OA Access Token from: https://developers.zalo.me/tools/explorer');
    console.log('Step 5: Copy .env.example to .env and fill in ZALO_ACCESS_TOKEN');
    console.log('Step 6: Ask your girlfriend to follow your OA on Zalo');
    console.log('Step 7: Run this script again to see her User ID\n');
    console.log('To get Access Token (easiest way):');
    console.log('  1. Go to https://developers.zalo.me/tools/explorer');
    console.log('  2. Select your app and OA');
    console.log('  3. Click "Get Access Token"');
    console.log('  4. Copy the token to your .env file\n');
    return;
  }

  console.log('Fetching followers from your Zalo OA...\n');

  try {
    const url = 'https://openapi.zalo.me/v2.0/oa/getfollowers?data={"offset":0,"count":50}';
    const response = await fetch(url, {
      headers: { access_token: ACCESS_TOKEN },
    });
    const data = await response.json();

    if (data.error !== 0) {
      console.error('Error fetching followers:', data.message || data);
      return;
    }

    const followers = data.data?.followers || [];
    if (followers.length === 0) {
      console.log('No followers yet. Ask your girlfriend to follow your Zalo OA first.');
      return;
    }

    console.log(`Found ${followers.length} follower(s):\n`);
    for (const f of followers) {
      console.log(`  Name:    ${f.display_name}`);
      console.log(`  User ID: ${f.user_id}`);
      console.log('  ---');
    }

    console.log('\nCopy her User ID to RECIPIENT_USER_ID in your .env file.');
  } catch (err) {
    console.error('Network error:', err.message);
  }
}

listFollowers();
