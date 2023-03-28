import { Client, Message, TextChannel } from 'discord.js';
import { ceil, floor, isEqual, repeat, toInteger } from 'lodash';
import Player from '../models/player.schema';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import { getGuild } from './guild';
import { sendMessage } from './messages';

const getPretty = ({ value, slotLength }: { value: string; slotLength: number }) => {
    const valueLength = value.length;
    const valueSpacing = floor((slotLength - valueLength) / 2);

    const pretty = `${repeat(' ', valueSpacing)}${value}${repeat(' ', valueSpacing)}${
        valueLength % 2 === 0 ? '' : ' '
    }`;

    return pretty;
};

export const updateLeaderboard = async ({ client }: { client: Client }): Promise<void> => {
    return new Promise(async resolve => {
        const leaderboardChannelId = await getChannelId(ChannelsType.leaderboard);

        const guild = await getGuild(client);
        const channel = await guild?.channels.fetch(leaderboardChannelId);
        const messages = await (channel as TextChannel).messages.fetch();

        let message = messages.first() as Message<boolean>;

        if (!message) {
            message = await sendMessage({
                channelId: leaderboardChannelId,
                messageContent: 'Loading...',
                client,
            });
        }
        const topPlayers = await Player.find().sort({ wins: -1 }).limit(20);
        let content = '```';
        content = content + `| Rank |     Name     | Wins | Games Played | Win Rate % |`;
        content = `${content}
+------+--------------+------+--------------+------------+`;
        const nameSlotLength = 14;

        for (const i in topPlayers) {
            const p = topPlayers[i];
            const { history } = p;
            const nameLength = Math.min(p.name.length, 10);
            const whitespace = (nameSlotLength - nameLength) / 2;
            const wins = history.filter(match => match.result === 'win').length;
            const losses = history.filter(match => match.result === 'loss').length;
            const winRate = ceil((wins / (wins + losses)) * 100);

            const prettyName = `${repeat(' ', whitespace)}${p.name.slice(0, 10)}${repeat(
                ' ',
                whitespace
            )}${nameLength % 2 === 0 ? '' : ' '}`;
            const prettyWins = getPretty({ value: wins.toString(), slotLength: 6 });
            const prettyPlayed = getPretty({
                value: (wins + losses).toString(),
                slotLength: 14,
            });
            const prettyWinRate = getPretty({
                value: `${!isNaN(winRate) ? winRate : 0}%`,
                slotLength: 12,
            });
            content = `${content}
|  ${i}   |${prettyName}|${prettyWins}|${prettyPlayed}|${prettyWinRate}|`;
        }
        content = content + '```';

        message.edit(content);
        resolve();
    });
};
