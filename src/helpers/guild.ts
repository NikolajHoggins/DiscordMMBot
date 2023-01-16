import { Client } from 'discord.js';

export const getGuild = (client: Client) => {
    if (!process.env.SERVER_ID) return null;
    return client.guilds.fetch(process.env.SERVER_ID);
};
