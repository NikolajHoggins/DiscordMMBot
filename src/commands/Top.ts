import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { ceil } from 'lodash';
import { Command } from '../Command';
import Player, { IPlayer } from '../models/player.schema';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import { addToSortedSet, getFromSortedSetDesc } from '../services/redis.service';

export const Top: Command = {
    name: 'top',
    description: 'Get top players',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const queueChannel = await getChannelId(ChannelsType['bot-commands']);
        if (interaction.channelId !== queueChannel) {
            return interaction.reply({
                content: `Keep messages in <#${queueChannel}> channel`,
                ephemeral: true,
            });
        }

        let topPlayersData: IPlayer[] = (await getFromSortedSetDesc('topPlayers', 0, 10)).map(p =>
            JSON.parse(p || '')
        );

        let topPlayers: IPlayer[] = [];
        if (!topPlayersData || topPlayersData.length === 0) {
            topPlayers = await Player.find().sort({ rating: -1 }).limit(10);
            console.log('topPlayers', topPlayers);
            for (let i = 0; i < topPlayers.length; i++) {
                await addToSortedSet('topPlayers', topPlayers[i].rating, topPlayers[i]);
            }
            topPlayersData = topPlayers;
        }

        let content = '```';
        topPlayersData.forEach((player, i) => {
            const { history } = player;
            const wins = history.filter(match => match.result === 'win').length;
            const losses = history.filter(match => match.result === 'loss').length;
            const winRate = ceil((wins / (wins + losses)) * 100);

            content = `${content}
        [${i + 1}] - ${player.rating} - ${player.name} - ${wins} wins - ${
                !isNaN(winRate) ? winRate : 0
            }%`;
        });

        content = content + '```';

        await interaction.reply({
            ephemeral: true,
            content,
        });
    },
};
