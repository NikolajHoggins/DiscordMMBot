import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { ceil, findIndex, floor, indexOf } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getRankName } from '../helpers/rank.js';
import Player from '../models/player.schema.js';
import { getChannelId } from '../services/system.service.js';
import { ChannelsType } from '../types/channel.js';

const emojis = {
    w: '<:BR_W:1095827374655934604>',
    l: '<:BR_L:1095827371971596408>',
    d: '<:BR_D:1095827346931601458>',
};

const getEmoji = (result: string) => {
    if (['w', 'l', 'd'].includes(result)) return emojis[result as 'w' | 'l' | 'd'];
    return '';
};
export const Countdown: Command = {
    name: 'countdown',
    description: 'Check #prize-pool',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const queueChannel = await getChannelId(ChannelsType['bot-commands']);
        if (interaction.channelId !== queueChannel) {
            return interaction.reply({
                content: `Keep messages in <#${queueChannel}> channel`,
                ephemeral: true,
            });
        }

        const playerList = await Player.find({ $expr: { $gt: [{ $size: '$history' }, 0] } });
        const sortedPlayerList = playerList.sort((a, b) => b.history.length - a.history.length);

        const player = await Player.findOne({ discordId: user.id });
        if (!player) throw new Error("You don't have any stats yet!");

        const START_TIME = 1688222700000;
        const ONE_WEEK = 604800000;
        const END_TIME = START_TIME + ONE_WEEK;

        const yourIndex = indexOf(
            playerList.map(p => p.discordId),
            player.discordId
        );

        const statsEmbed = new EmbedBuilder()
            .setTitle(`Tournament countdown - ends <t:${Math.floor(END_TIME / 1000)}:R>`)
            .setDescription(
                "Here's the leaderboards for the opening week tournament! Most games played wins pricepool <#1096210640219156572>"
            )
            .setColor('#C69B6D')
            .addFields([
                {
                    name: 'Unique players played:',
                    value: `${playerList.length} players`,
                },
                {
                    name: 'Current top 2 players',
                    value:
                        '' +
                        sortedPlayerList
                            .slice(0, 2)
                            .map(
                                (player, i) =>
                                    `#${i + 1} - <@${player.discordId}> - ${
                                        player.history.length || 0
                                    } matches`
                            )
                            .join('\n'),
                },
                {
                    name: '3rd and 4th place (no prize)',
                    value:
                        '' +
                        sortedPlayerList
                            .slice(2, 4)
                            .map(
                                (player, i) =>
                                    `#${i + 3} - <@${player.discordId}> - ${
                                        player.history?.length || 0
                                    } matches`
                            )
                            .join('\n'),
                },
                {
                    name: 'Your matches',
                    value: `#${yourIndex + 1} - <@${player.discordId}> - ${
                        player.history?.length || 0
                    } matches`,
                },
            ]);

        await interaction.reply({
            embeds: [statsEmbed],
        });
        // return interaction.reply({
        //     content: 'This command is currently disabled',
        //     ephemeral: true,
        // });
    },
};
