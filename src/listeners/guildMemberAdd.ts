import { Client, Events, GuildMember, Interaction, PartialGuildMember } from 'discord.js';
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';

export default (client: Client): void => {
    client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
        //Get config
        const { roles } = await getConfig();
        const unrankedRole = roles.find(t => t.name === RanksType.unranked);
        const noregionRole = roles.find(t => t.name === RanksType.noregion);
        if (!unrankedRole || !noregionRole) throw new Error('Roles not found');

        await member.roles.add(unrankedRole.id);
        await member.roles.add(noregionRole.id);
    });
};
