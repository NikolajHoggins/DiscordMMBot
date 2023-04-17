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

        // const queueChannel = await getChannelId(ChannelsType['bot-commands']);
        // if (interaction.channelId !== queueChannel) {
        //     return interaction.reply({
        //         content: `Keep messages in <#${queueChannel}> channel`,
        //         ephemeral: true,
        //     });
        // }

        const playerList = await Player.find(
            {},
            { arrayLength: { $size: '$history' }, discordId: 1, history: 1 }
        ).sort({ arrayLength: -1 });

        const player = await Player.findOne({ discordId: user.id });
        if (!player) throw new Error("You don't have any stats yet!");

        const { history } = player;

        const wins = history.filter(match => match.result === 'win').length;
        const matches = history.length;
        const losses = matches - wins;
        const winRate = ceil((wins / (wins + losses)) * 100);

        const isUnranked = player.history.length < 10;
        const rankName = isUnranked ? 'Unranked' : getRankName(player.rating);
        const playerRating = isUnranked ? 'Play 10 matches' : floor(player.rating);

        const START_TIME = 1681411005719;
        const ONE_WEEK = 604800000;
        const END_TIME = START_TIME + ONE_WEEK;

        const yourIndex = indexOf(
            playerList.map(p => p.discordId),
            player.discordId
        );

        const statsEmbed = new EmbedBuilder()
            .setTitle(`Tournament countdown - <t:${Math.floor(END_TIME / 1000)}:R>`)
            .setColor('#C69B6D')
            .addFields([
                {
                    name: 'Current top 2 players',
                    value:
                        '' +
                        playerList
                            .slice(0, 2)
                            .map(
                                (player, i) =>
                                    `#${i + 1} - <@${player.discordId}> - ${
                                        player.history?.length || 0
                                    } matches`
                            )
                            .join('\n'),
                },
                {
                    name: '3rd and 4th place (no prize)',
                    value:
                        '' +
                        playerList
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

        // .setDescription(`Map: ${capitalize(match.map)}`)
        //     {
        //         name: 'Rating',
        //         value: '' + playerRating,
        //         inline: true,
        //     },
        //     {
        //         name: 'Match History',
        //         value:
        //             player.history
        //                 .slice(-10)
        //                 .map(h => `${getEmoji(h.result[0])}`)
        //                 .join('') || 'No matches played',
        //         inline: false,
        //     },
        //     ...(history.length < 10
        //         ? [
        //               {
        //                   name: 'You are unranked',
        //                   value: "Stats will be available once you've played 10 matches.",
        //                   inline: false,
        //               },
        //           ]
        //         : []),
        // ]);
        const content = `User ${player.name} [${Math.floor(
            player.rating
        )}] has ${wins} wins and ${losses} losses. ${!isNaN(winRate) ? winRate : 0}% winrate`;

        await interaction.reply({
            embeds: [statsEmbed],
        });
    },
};
