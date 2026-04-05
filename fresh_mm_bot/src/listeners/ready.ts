import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { Commands } from '../Commands';
import scaffold from '../helpers/scaffold';
import { updateLeaderboard } from '../helpers/leaderboard';
import { GameType } from '../types/queue';

const STATUS_CHANNEL_ID = '1490124502120661122';

export default (client: Client): void => {
    client.on('ready', async () => {
        if (!client.user || !client.application) {
            return;
        }

        await client.application.commands.set(Commands);

        //init channels
        await scaffold(client);
        updateLeaderboard({ client, gameType: GameType.squads });
        updateLeaderboard({ client, gameType: GameType.duels });

        console.log(`${client.user.username} is online`);

        const statusChannel = await client.channels.fetch(STATUS_CHANNEL_ID).catch(() => null);
        if (statusChannel && 'send' in statusChannel) {
            const onlineEmbed = new EmbedBuilder()
                .setTitle('System Online')
                .setColor('#00CC44')
                .setDescription('The bot has successfully restarted. All queues are now open.')
                .setTimestamp();
            await (statusChannel as TextChannel).send({ embeds: [onlineEmbed] });
        }
    });
};
