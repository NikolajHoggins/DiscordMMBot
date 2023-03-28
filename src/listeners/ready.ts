import { Client, Guild, TextChannel } from 'discord.js';
import { Commands } from '../Commands';
import { getGuild } from '../helpers/guild';
import scaffold from '../helpers/scaffold';

export default (client: Client): void => {
    client.on('ready', async () => {
        if (!client.user || !client.application) {
            return;
        }

        await client.application.commands.set(Commands);

        //cache ping message
        const guild = await getGuild(client);

        //init channels
        scaffold(client);

        console.log(`${client.user.username} is online`);
    });
};
