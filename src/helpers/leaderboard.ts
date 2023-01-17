import { Client, TextChannel } from 'discord.js';
import { ceil, floor, isEqual, repeat, toInteger } from 'lodash';
import Player from '../models/player.schema';
import { getGuild } from './guild';
import { botLog, sendMessage } from './messages';

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
        if (!process.env.LEADERBOARD_MESSAGE || !process.env.LEADERBOARD_CHANNEL) {
            botLog({ messageContent: 'no leaderboardchannel env', client });
            return;
        }

        const guild = await getGuild(client);
        const channel = await guild?.channels.fetch(process.env.LEADERBOARD_CHANNEL);
        const message = await (channel as TextChannel).messages.fetch(
            process.env.LEADERBOARD_MESSAGE
        );
        const topPlayers = await Player.find().sort({ wins: -1 }).limit(20);
        let content = '```';
        content = content + `| Rank |     Name     | Wins | Games Played | Win Rate % |`;
        content = `${content}
+------+--------------+------+--------------+------------+`;
        const nameSlotLength = 14;

        for (const i in topPlayers) {
            const p = topPlayers[i];
            const nameLength = Math.min(p.name.length, 10);
            const whitespace = (nameSlotLength - nameLength) / 2;
            const winRate = toInteger(((p.wins / (p.wins + p.losses)) * 100).toFixed(1));
            const prettyName = `${repeat(' ', whitespace)}${p.name.slice(0, 10)}${repeat(
                ' ',
                whitespace
            )}${nameLength % 2 === 0 ? '' : ' '}`;
            const prettyWins = getPretty({ value: p.wins.toString(), slotLength: 6 });
            const prettyPlayed = getPretty({
                value: (p.wins + p.losses).toString(),
                slotLength: 14,
            });
            const prettyWinRate = getPretty({ value: `${winRate}%`, slotLength: 12 });
            content = `${content}
|  ${i}   |${prettyName}|${prettyWins}|${prettyPlayed}|${prettyWinRate}|`;
        }
        content = content + '```';

        message.edit(content);
        resolve();
    });
};
