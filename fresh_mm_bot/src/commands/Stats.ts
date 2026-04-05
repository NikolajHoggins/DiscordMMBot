import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { ceil, floor } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getRankName } from '../helpers/rank';
import Player from '../models/player.schema';
import { getChannelId, getServerEmotes } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import { EmotesType } from '../types/emotes';
import { safelyReplyToInteraction } from '../helpers/interactions';

const getEmoji = (result: string, emojis: EmotesType) => {
    if (['w', 'l', 'd'].includes(result)) return `<:${emojis[result as 'w' | 'l' | 'd']}>`;
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
        const emotes = await getServerEmotes();

        const queueChannel = await getChannelId(ChannelsType['bot-commands']);
        if (interaction.channelId !== queueChannel) {
            return safelyReplyToInteraction({
                interaction,
                content: `Keep messages in <#${queueChannel}> channel`,
                ephemeral: true,
            });
        }

        const userToCheck = mention || user;
        const player = await playerService.findOrCreate(userToCheck);
        if (player.name !== userToCheck.username) {
            await Player.updateOne({ discordId: userToCheck.id }, { name: userToCheck.username });
            player.name = userToCheck.username;
        }
        const playerList = await Player.aggregate([
            { $match: { 'history.9': { $exists: true }, rating: { $gt: player.rating } } },
            { $group: { _id: null, count: { $sum: 1 } } },
        ]);

        const { history, duelsHistory } = player;
        const isUnranked = history.length < 10;
        const ratingPosition = isUnranked ? '?' : playerList[0]?.count + 1 || 1;

        const historyNoAbandon = history.filter(match => match.result !== 'abandon');
        const wins = historyNoAbandon.filter(match => match.result === 'win').length;
        const matches = historyNoAbandon.length;
        const losses = matches - wins;
        const winRate = ceil((wins / (wins + losses)) * 100);

        const rankName = isUnranked ? 'Unranked' : getRankName(player.rating);
        const playerRating = isUnranked ? 'Play 10 matches' : floor(player.rating);

        const statsEmbed = new EmbedBuilder()
            .setTitle(`#${ratingPosition} - ${player.name}`)
            .setColor('#C69B6D')
            .setThumbnail(userToCheck.avatarURL())
            .setDescription(`${rankName} \nGames played - ${historyNoAbandon.length}`)
            // .setDescription(`Map: ${capitalize(match.map)}`)
            .addFields([
                {
                    name: 'Wins',
                    value: '' + historyNoAbandon.filter(match => match.result === 'win').length,
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
                        historyNoAbandon
                            .slice(-10)
                            .map(h => `${getEmoji(h.result[0], emotes)}`)
                            .join('') || 'No matches played',
                    inline: false,
                },
                ...(historyNoAbandon.length < 10
                    ? [
                          {
                              name: 'You are unranked',
                              value: "Stats will be available once you've played 10 matches.",
                              inline: false,
                          },
                      ]
                    : []),
            ]);

        if (duelsHistory && duelsHistory.length > 0) {
            statsEmbed.addFields([
                {
                    name: 'Duels',
                    value: `${duelsHistory.length} matches`,
                    inline: false,
                },
                {
                    name: 'Duels History',
                    value:
                        duelsHistory
                            .slice(-10)
                            .map(h => `${getEmoji(h.result[0], emotes)}`)
                            .join('') || 'No matches played',
                    inline: false,
                },
            ]);
        }

        await safelyReplyToInteraction({
            interaction,
            embeds: [statsEmbed],
        });
    },
};
