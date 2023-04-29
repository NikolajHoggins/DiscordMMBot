import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { getGuild } from '../helpers/guild';
import { botLog } from '../helpers/messages';

import * as matchService from '../services/match.service';
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';

export const ForceStart: Command = {
    name: 'force_start',
    description: 'Force start game lobby',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        if (!member) return;

        const config = await getConfig();
        const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;

        const isMod = await member.roles.cache.some(r => r.id === modRoleId);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }
        //find match with channelId
        const match = await matchService.findByChannelId(channelId);

        const content = match ? 'starting' : 'Not in match thread';

        botLog({
            messageContent: `<@${user.id}> force started match ${match?.match_number}`,
            client,
        });
        await interaction.reply({
            ephemeral: true,
            content,
        });

        if (!match) return;
        await matchService.startVotingPhase(client, match);
    },
};
