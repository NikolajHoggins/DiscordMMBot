import { Client } from 'discord.js';
import Player from '../models/player.schema';
import { RanksType } from '../types/channel';
import { getGuild } from './guild';
import { getConfig } from '../services/system.service';
import { capitalize, reject } from 'lodash';

export const rankCutoffs: Record<number, RanksType> = {
    0: RanksType.plastic,
    1100: RanksType.iron,
    1200: RanksType.copper,
    1300: RanksType.bronze,
    1400: RanksType.silver,
    1500: RanksType.gold,
    1700: RanksType.platinum,
    1900: RanksType.diamond,
    2200: RanksType.master,
};

export const rankColors: Partial<Record<RanksType, string>> = {
    [RanksType.plastic]: '#d3d3d3',
    [RanksType.iron]: 'rgb(84, 110, 122)',
    [RanksType.copper]: 'rgb(230, 126, 34)',
    [RanksType.bronze]: 'rgb(231, 76, 60)',
    [RanksType.silver]: 'rgb(149, 165, 166)',
    [RanksType.gold]: 'rgb(241, 196, 15)',
    [RanksType.platinum]: 'rgb(168, 184, 252)',
    [RanksType.diamond]: 'rgb(155, 89, 182)',
    [RanksType.master]: 'rgb(46, 204, 113)',
};

const getClosestLowerNumber = (numbers: number[], targetNumber: number): number => {
    let closestLowerNumber = 0;
    for (let i = 0; i < numbers.length; i++) {
        const currentNumber = numbers[i];
        if (currentNumber < targetNumber) {
            if (!closestLowerNumber || currentNumber > closestLowerNumber) {
                closestLowerNumber = currentNumber;
            }
        }
    }
    return closestLowerNumber;
};

export const checkRank = ({ client, playerId }: { client: Client; playerId: string }) => {
    return new Promise(async resolve => {
        const player = await Player.findOne({ discordId: playerId });
        if (!player) return reject('Player not found');

        const { history } = player;
        const historyNoAbandon = history.filter(match => match.result !== 'abandon');
        const isUnranked = historyNoAbandon.length < 10;

        const config = await getConfig();

        const closestEloCutoff = getClosestLowerNumber(
            Object.keys(rankCutoffs).map(k => parseInt(k)),
            player.rating
        );

        const currentRankRole: RanksType = rankCutoffs[closestEloCutoff];
        const unrankedId = config.roles.find(({ name }) => name === RanksType.unranked)?.id;

        const roleId = isUnranked
            ? unrankedId
            : config.roles.find(({ name }) => name === currentRankRole)?.id;

        if (!roleId || !unrankedId) throw new Error('Role not found');

        const guild = await getGuild(client);

        const member = await guild.members.fetch(player.discordId);
        if (!member) throw new Error('Member not found');
        const currentRoles = await member.roles.cache.map(r => r.id);

        await Promise.all(
            currentRoles.map(r => {
                return new Promise(async resolve => {
                    const currentRankName = config.roles.find(({ id }) => id === r)?.name;
                    if (!currentRankName) return resolve(true);

                    if (Object.values(rankCutoffs).includes(currentRankName as RanksType)) {
                        await member.roles.remove(r);
                        return resolve(true);
                    }
                    resolve(true);
                });
            })
        );
        if (!isUnranked) {
            await member.roles.remove(unrankedId);
        }

        await member.roles.add(roleId);

        resolve(true);
    });
};

export const getRankName = (rating: number): string => {
    const closestEloCutoff = getClosestLowerNumber(
        Object.keys(rankCutoffs).map(k => parseInt(k)),
        rating
    );

    const currentRankRole: RanksType = rankCutoffs[closestEloCutoff];
    return capitalize(currentRankRole);
};
