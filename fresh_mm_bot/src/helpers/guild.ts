import { Client, Guild, Role } from 'discord.js';

export const getGuild = (client: Client): Promise<Guild> => {
    if (!process.env.SERVER_ID) throw new Error('SERVER_ID not set');
    const guild = client.guilds.fetch(process.env.SERVER_ID);
    if (!guild) throw new Error('Guild not found');
    return guild;
};

export const getEveryoneRole = async (client: Client): Promise<Role> => {
    if (!process.env.SERVER_ID) throw new Error('SERVER_ID not set');
    const guild = await getGuild(client);

    const everyoneRole = await guild.roles.fetch(process.env.SERVER_ID);
    if (!everyoneRole) throw new Error('Everyone role not found');

    return everyoneRole;
};
