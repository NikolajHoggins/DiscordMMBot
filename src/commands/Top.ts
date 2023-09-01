import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { ceil, toInteger } from 'lodash';
import { Command } from '../Command';
import Player, { IPlayer } from '../models/player.schema';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import { getFromRedis, setToRedis } from '../services/redis.service';

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

        const topPlayersData = await getFromRedis('topPlayers');
        let topPlayers: IPlayer[] = [];
        if (!topPlayersData) {
            topPlayers = await Player.find().sort({ rating: -1 }).limit(10);
            await setToRedis('topPlayers', JSON.stringify(topPlayers));
            // topPlayersData = JSON.stringify(topPlayers);
        } else {
            topPlayers = JSON.parse(topPlayersData);
        }

        let content = '```';
        topPlayers.forEach((player, i) => {
            const { history } = player;
            const wins = history.filter(match => match.result === 'win').length;
            const losses = history.filter(match => match.result === 'loss').length;
            const winRate = ceil((wins / (wins + losses)) * 100);

            content = `${content}
        [${i + 1}] - ${player.name} - ${wins} wins - ${!isNaN(winRate) ? winRate : 0}%`;
        });

        content = content + '```';

        await interaction.reply({
            ephemeral: true,
            content,
        });
    },
};
