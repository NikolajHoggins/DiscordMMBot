import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { ceil, findIndex, floor } from 'lodash';
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
export const Stats: Command = {
    name: 'stats',
    description: 'Get player stats?',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to get stats for',
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;

        const queueChannel = await getChannelId(ChannelsType['bot-commands']);
        if (interaction.channelId !== queueChannel) {
            return interaction.reply({
                content: `Keep messages in <#${queueChannel}> channel`,
                ephemeral: true,
            });
        }

        const userToCheck = mention || user;
        const playerList = await Player.find({
            $expr: {
                $gte: [{ $size: '$history' }, 10],
            },
        }).sort({ rating: -1 });

        const player = await playerService.findOrCreate(userToCheck);
        const { history } = player;
        const eloPosition =
            history.length > 9 ? findIndex(playerList, { discordId: userToCheck.id }) + 1 : '?';
        const wins = history.filter(match => match.result === 'win').length;
        const matches = history.length;
        const losses = matches - wins;
        const winRate = ceil((wins / (wins + losses)) * 100);

        const isUnranked = player.history.length < 10;
        const rankName = isUnranked ? 'Unranked' : getRankName(player.rating);
        const playerRating = isUnranked ? 'Play 10 matches' : floor(player.rating);

        const statsEmbed = new EmbedBuilder()
            .setTitle(`#${eloPosition} - ${player.name}`)
            .setColor('#C69B6D')
            .setThumbnail(userToCheck.avatarURL())
            .setDescription(`${rankName} \nGames played - ${player.history.length}`)
            // .setDescription(`Map: ${capitalize(match.map)}`)
            .addFields([
                {
                    name: 'Wins',
                    value: '' + player.history.filter(match => match.result === 'win').length,
                    inline: true,
                },
                {
                    name: 'Rating',
                    value: '' + playerRating,
                    inline: true,
                },
                {
                    name: 'Win rate',
                    value: `${!isNaN(winRate) ? winRate : 0}%`,
                    inline: true,
                },
                {
                    name: 'Match History',
                    value:
                        player.history
                            .slice(-10)
                            .map(h => `${getEmoji(h.result[0])}`)
                            .join('') || 'No matches played',
                    inline: false,
                },
                ...(history.length < 10
                    ? [
                          {
                              name: 'You are unranked',
                              value: "Stats will be available once you've played 10 matches.",
                              inline: false,
                          },
                      ]
                    : []),
            ]);
        const content = `User ${player.name} [${Math.floor(
            player.rating
        )}] has ${wins} wins and ${losses} losses. ${!isNaN(winRate) ? winRate : 0}% winrate`;

        await interaction.reply({
            embeds: [statsEmbed],
        });
    },
};
