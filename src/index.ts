import { Client, IntentsBitField } from 'discord.js';

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
// runTests();
