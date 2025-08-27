import { Client, Message, TextChannel } from 'discord.js';
import { ceil, floor, isEqual, repeat, toInteger } from 'lodash';
import Player from '../models/player.schema';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import { getGuild } from './guild';
import { sendMessageInChannel } from './messages';
import { GameType, gameTypeLeaderboardChannels, gameTypeRatingKeys } from '../types/queue';
import { trackingLinks } from './tracking';

const getPretty = ({ value, slotLength }: { value: string; slotLength: number }) => {
    const valueLength = value.length;
    const valueSpacing = floor((slotLength - valueLength) / 2);

    const pretty = `${repeat(' ', valueSpacing)}${value}${repeat(' ', valueSpacing)}${
        valueLength % 2 === 0 ? '' : ' '
    }`;

    return pretty;
};

export const updateLeaderboard = async ({
    client,
    gameType,
}: {
    client: Client;
    gameType: GameType;
}): Promise<void> => {
    return new Promise(async resolve => {
        const leaderboardChannelId = await getChannelId(gameTypeLeaderboardChannels[gameType]);

        const guild = await getGuild(client);

        const channel = await guild?.channels.fetch(leaderboardChannelId);
        const messages = await (channel as TextChannel).messages.fetch();

        let message = messages.first() as Message<boolean>;
        const isStatsServer = Object.keys(trackingLinks).includes(guild.id || '');
        if (isStatsServer)
            return message.edit(
                `Leaderboards are available through the bots website: ${
                    trackingLinks[guild.id as keyof typeof trackingLinks]
                }/leaderboard`
            );

        if (!message) {
            message = await sendMessageInChannel({
                channelId: leaderboardChannelId,
                messageContent: 'Loading...',
                client,
            });
        }
        const ratingKey = gameTypeRatingKeys[gameType].rating as 'rating' | 'duelsRating';
        const historyKey = gameTypeRatingKeys[gameType].history as 'history' | 'duelsHistory';

        const topPlayers = await Player.find({
            $expr: {
                $gte: [{ $size: '$' + historyKey }, gameType === GameType.squads ? 10 : 1],
            },
        })
            .sort({ [ratingKey]: -1 })
            .limit(20);
        let content = '```';
        content = content + `| Rank |     Name     | Rating | Wins | Games Played | Win Rate % |`;
        content = `${content}
+------+--------------+--------+------+--------------+------------+`;
        const nameSlotLength = 14;

        for (const i in topPlayers) {
            const p = topPlayers[i];
            const history = p[historyKey];
            const nameLength = Math.min(Array.from(p.name).length, 10);
            const whitespace = (nameSlotLength - nameLength) / 2;
            const wins = history.filter(match => match.result === 'win').length;
            const losses = history.filter(match => match.result === 'loss').length;
            const total = history.length;
            const winRate = ceil((wins / total) * 100);

            const prettyName = `${repeat(' ', whitespace)}${p.name.slice(0, 10)}${repeat(
                ' ',
                whitespace
            )}${nameLength % 2 === 0 ? '' : ' '}`;
            const actualRating =
                gameType === GameType.squads && p.history.length < 10
                    ? 'Hidden'
                    : Math.floor(p[ratingKey]).toString();
            const prettyRating = getPretty({
                value: actualRating,
                slotLength: 8,
            });
            const prettyWins = getPretty({ value: wins.toString(), slotLength: 6 });
            const prettyPlayed = getPretty({
                value: total.toString(),
                slotLength: 14,
            });
            const prettyWinRate = getPretty({
                value: `${!isNaN(winRate) ? winRate : 0}%`,
                slotLength: 12,
            });
            const prettyRank = getPretty({ value: '' + (toInteger(i) + 1), slotLength: 6 });
            content = `${content}
|${prettyRank}|${prettyName}|${prettyRating}|${prettyWins}|${prettyPlayed}|${prettyWinRate}|`;
        }
        content = content + '```';

        message.edit(content);
        resolve();
    });
};
