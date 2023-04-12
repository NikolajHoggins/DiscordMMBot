import { Client } from 'discord.js';
import { RanksType } from '../types/channel.js';
import { IPlayer } from '../models/player.schema.js';
import { getGuild } from './guild.js';
import { getConfig } from '../services/system.service.js';

const rankCutoffs: Record<number, RanksType> = {
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

export const checkRank = ({ client, player }: { client: Client; player: IPlayer }) => {
    return new Promise(async resolve => {
        if (player.history.length + 1 < 10) {
            resolve(true);
            return;
        }

        console.log('=== checkRank ===');
        console.log('got player', player.name);
        console.log('rating', player.rating);
        const closestEloCutoff = getClosestLowerNumber(
            Object.keys(rankCutoffs).map(k => parseInt(k)),
            player.rating
        );
        const role: RanksType = rankCutoffs[closestEloCutoff];
        const config = await getConfig();
        console.log('rank', role, closestEloCutoff);
        const roleId = config.roles.find(({ name }) => name === role)?.id;
        const unrankedId = config.roles.find(({ name }) => name === role)?.id;

        if (!roleId || !unrankedId) throw new Error('Role not found');
        console.log('role id', roleId);

        const guild = await getGuild(client);
        const guildRole = await guild.roles.fetch(roleId);
        if (!guildRole) throw new Error('guild role not found');
        const member = await guild.members.fetch(player.discordId);
        if (!member) throw new Error('Member not found');
        const currentRoles = member.roles.cache.map(r => r.id);
        await Promise.all(
            currentRoles.map(r => {
                if (Object.values(rankCutoffs).includes(r)) {
                    return member.roles.remove(r);
                }
            })
        );
        await member.roles.remove(unrankedId);
        await member.roles.add(guildRole);

        resolve(true);
    });
};
