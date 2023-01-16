import { Client, IntentsBitField } from 'discord.js';

import * as dotenv from 'dotenv';
import initStatusCron from './crons/updateQueue';
import interactionCreate from './listeners/interactionCreate';
import reaction from './listeners/reaction';
import ready from './listeners/ready';
import { connectToDatabase } from './services/database.service';
console.log('Bot is starting...');
dotenv.config();

const client = new Client({
    intents: [IntentsBitField.Flags.GuildMessageReactions],
});

ready(client);
reaction(client);
interactionCreate(client);
connectToDatabase();
client.login(process.env.BOT_TOKEN);

//Register cronjobs
initStatusCron(client);
