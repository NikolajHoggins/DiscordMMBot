import { Client } from 'discord.js';
import { Commands } from '../Commands';
import scaffold from '../helpers/scaffold';
import { updateLeaderboard } from '../helpers/leaderboard';
import { GameType } from '../types/queue';

export default (client: Client): void => {
    client.on('ready', async () => {
        if (!client.user || !client.application) {
            return;
        }

        await client.application.commands.set(Commands);

        //init channels
        scaffold(client);
        updateLeaderboard({ client, gameType: GameType.squads });
        updateLeaderboard({ client, gameType: GameType.duels });

        console.log(`${client.user.username} is online`);
    });
};
