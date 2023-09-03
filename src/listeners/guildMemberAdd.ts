import { Client, Events, GuildMember, PartialGuildMember } from 'discord.js';
import { getConfig } from '../services/system.service';
import { RanksType } from '../types/channel';
import Queue from '../models/queue.schema';

export default (client: Client): void => {
    client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
        //Get config
        const { roles } = await getConfig();
        const unrankedRole = roles.find(t => t.name === RanksType.unranked);

        if (!unrankedRole) throw new Error('Roles not found');

        //A user should be locked if under a month old
        const ONE_MONTH = 1000 * 60 * 60 * 24 * 30;
        const accountAge = Date.now() - member.user.createdTimestamp;
        if (accountAge < ONE_MONTH) {
            const lockedRole = roles.find(t => t.name === RanksType.locked);
            if (!lockedRole) throw new Error('Roles not found');
            await member.roles.add(lockedRole.id);
        }
        await member.roles.add(unrankedRole.id);
    });
    client.on(Events.GuildMemberRemove, async (member: PartialGuildMember | GuildMember) => {
        const queue = await Queue.findOne({ discordId: member.id });
        if (queue) {
            await Queue.deleteOne({ discordId: member.id });
        }
    });
};
