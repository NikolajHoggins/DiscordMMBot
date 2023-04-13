import { Client, Guild, TextChannel } from 'discord.js';
import { Commands } from '../Commands';
import { getGuild } from '../helpers/guild';
import scaffold from '../helpers/scaffold';
import Match from '../models/match.schema.js';
import { calculateEloChanges } from '../helpers/elo.js';

export default (client: Client): void => {
    client.on('ready', async () => {
        if (!client.user || !client.application) {
            return;
        }

        await client.application.commands.set(Commands);

        //init channels
        scaffold(client);

        //Test elo
        // const match = await Match.findOne({ match_number: 1 });
        // if (match) {
        //     await calculateEloChanges(match, client);
        // }

        console.log(`${client.user.username} is online`);
    });
};
