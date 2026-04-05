// One-time script: posts the April 3-4 update embed to the status channel
// Run with: node scripts/postUpdate.js
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manual .env parse (no dotenv dep needed)
const envPath = resolve(process.cwd(), '.env');
const env = Object.fromEntries(
    readFileSync(envPath, 'utf-8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);

const TOKEN = env['BOT_TOKEN'];
const CHANNEL_ID = '1490124502120661122';
const ROLE_ID = '1422408866020462664';

if (!TOKEN) {
    console.error('BOT_TOKEN not found in .env');
    process.exit(1);
}

const body = JSON.stringify({
    embeds: [
        {
            title: 'Bot Updates — April 4',
            description: [
                'Changes pushed today:\n',
                '• **Unqueue solo/party** — /unready now shows two options if you are in a party: leave queue solo or remove the entire party from queue. Only the party leader can unqueue the party.',
                '• **Party queue message** — When a party queues together, the queue channel now shows a single clean message listing the leader and party size.',
                '• **/reset_season** — Emojis removed, output cleaned up.',
                '• **Edit button duration** — The Edit button on timeout logs now shows the ban duration in the label.',
                '• **Restart fix** — /restart_bot now uses process.exit(0) instead of throwing an error, so nodemon reliably brings the bot back up.',
                '• **Status messages** — Online and offline embeds now post to the correct channel every time the bot starts or shuts down.',
            ].join('\n'),
            color: 0xffb3c6,
            footer: { text: 'April 4, 2026' },
        },
    ],
});

const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
        Authorization: `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
    },
    body,
});

if (!res.ok) {
    const err = await res.text();
    console.error('Failed to post update:', res.status, err);
    process.exit(1);
}

console.log('✅ Update embed posted successfully.');
