import { Client, EmbedBuilder, IntentsBitField, TextChannel } from 'discord.js';

import * as dotenv from 'dotenv';
import initStatusCron from './crons/updateQueue';
import interactionCreate from './listeners/interactionCreate';
import reaction from './listeners/reaction';
import ready from './listeners/ready';
import { connectToDatabase } from './services/database.service';
import guildMemberAdd from './listeners/guildMemberAdd';
import initTryStartCron from './crons/tryStart';
import initBanTickDownCron from './crons/banTickDown';
import { runTests } from './tests/elo';
import initEloDecayCron from './crons/eloDecay';
import initPostAimHeroCron from './crons/postAimHero';
import initCodeReminderCron from './crons/codeReminder';

console.log('Bot is starting...');
dotenv.config();

if (!process.env.BOT_TOKEN) throw new Error('No bot token');

const client = new Client({
    intents: [IntentsBitField.Flags.GuildMessageReactions, IntentsBitField.Flags.GuildMembers],
});

ready(client);
reaction(client);
interactionCreate(client);
guildMemberAdd(client);
connectToDatabase();
client.login(process.env.BOT_TOKEN);

//Register cronjobs
initStatusCron(client);
initTryStartCron(client);
initBanTickDownCron(client);
initEloDecayCron(client);
initPostAimHeroCron(client);
initCodeReminderCron(client);
// runTests();

const STATUS_CHANNEL_ID = '1490124502120661122';

const sendShutdownMessage = async (): Promise<void> => {
    try {
        const channel = await client.channels.fetch(STATUS_CHANNEL_ID).catch(() => null);
        if (channel && 'send' in channel) {
            const offlineEmbed = new EmbedBuilder()
                .setTitle('System Offline')
                .setColor('#CC0000')
                .setDescription(
                    'The bot is going down for maintenance. Active matches will be preserved, but queues are closed.'
                )
                .setTimestamp();
            await (channel as TextChannel).send({ embeds: [offlineEmbed] });
        }
    } catch (err) {
        console.error('Failed to send shutdown message:', err);
    } finally {
        process.exit(0);
    }
};

process.on('SIGINT', sendShutdownMessage);
process.on('SIGTERM', sendShutdownMessage);
