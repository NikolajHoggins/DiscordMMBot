import {
    ApplicationCommandType,
    Client,
    CommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { isUserMod } from '../../helpers/permissions';
import { createReadyMessage, sendMessage, botLog } from '../../helpers/messages';
import { findByChannelId } from '../../services/match.service';

export const ResendReady: Command = {
    name: 'resend_ready',
    description: 'Re-send the ready button and missing players message in this match channel',
    type: ApplicationCommandType.ChatInput,
    options: [],
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        const match = await findByChannelId(interaction.channelId);
        if (!match) {
            return interaction.reply({ content: 'Not in a match channel', ephemeral: true });
        }

        const readyContent = await createReadyMessage({ matchNumber: match.match_number });

        await sendMessage({
            channelId: match.channels.ready,
            client,
            messageContent:
                'Missing players: ' +
                match.players
                    .filter(p => !p.ready)
                    .map(p => `<@${p.id}>`)
                    .join(' '),
        });

        await sendMessage({
            channelId: match.channels.ready,
            client,
            messageContent: readyContent,
        });

        await botLog({
            messageContent: `Resent ready message for match ${match.match_number} in <#${match.channels.ready}>`,
            client,
        });

        return interaction.reply({ content: 'Ready message re-sent.', ephemeral: true });
    },
};
