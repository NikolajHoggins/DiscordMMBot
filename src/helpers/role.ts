import { Client, Role } from 'discord.js';
import { getGuild } from './guild.js';

export const createRole = ({
    roleName,
    client,
}: {
    roleName: string;
    client: Client;
}): Promise<Role> => {
    return new Promise(async resolve => {
        const guild = await getGuild(client);
        if (!guild) throw new Error("Couldn't fetch guild");
        const newRole = await guild.roles.create({
            name: roleName,
        });
        resolve(newRole);
    });
};
