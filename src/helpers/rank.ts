import { Client } from 'discord.js';
import { RanksType } from '../types/channel.js';
import Player, { IPlayer } from '../models/player.schema.js';
import { getGuild } from './guild.js';
import { getConfig } from '../services/system.service.js';
import { capitalize } from 'lodash';

export const rankCutoffs: Record<number, RanksType> = {
    0: RanksType.iron,
    200: RanksType.bronze,
    500: RanksType.silver,
    1000: RanksType.gold,
    1500: RanksType.platinum,
    2000: RanksType.diamond,
    2500: RanksType.master,
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
        if (!player) throw new Error('Player not found');

        if (player.history.length + 1 < 10) {
            resolve(true);
            return;
        }

        const config = await getConfig();

        const closestEloCutoff = getClosestLowerNumber(
            Object.keys(rankCutoffs).map(k => parseInt(k)),
            player.rating
        );

        const currentRankRole: RanksType = rankCutoffs[closestEloCutoff];

        const roleId = config.roles.find(({ name }) => name === currentRankRole)?.id;
        const unrankedId = config.roles.find(({ name }) => name === RanksType.unranked)?.id;

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

                    if (Object.values(rankCutoffs).includes(currentRankName)) {
                        await member.roles.remove(r);
                        return resolve(true);
                    }
                    resolve(true);
                });
            })
        );

        await member.roles.remove(unrankedId);
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
