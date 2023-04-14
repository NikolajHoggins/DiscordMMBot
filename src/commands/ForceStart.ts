import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    TextChannel,
    Channel,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { updateStatus } from '../crons/updateQueue';
import { getGuild } from '../helpers/guild';
import { botLog } from '../helpers/messages';

import * as matchService from '../services/match.service';

export const ForceStart: Command = {
    name: 'force_start',
    description: 'Force start game lobby',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;

        if (!process.env.MOD_ROLE_ID || !process.env.SERVER_ID) return;
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        //Fetch everyone for it to be in cache
        await guild?.roles.fetch(process.env.SERVER_ID);

        if (!member) return;

        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
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
