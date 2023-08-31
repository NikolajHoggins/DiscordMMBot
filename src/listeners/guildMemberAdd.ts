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

        await member.roles.add(unrankedRole.id);
    });
    client.on(Events.GuildMemberRemove, async (member: PartialGuildMember | GuildMember) => {
        const queue = await Queue.findOne({ discordId: member.id });
        if (queue) {
            await Queue.deleteOne({ discordId: member.id });
        }
    });
};
