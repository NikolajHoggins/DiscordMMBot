import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../../Command';
import Queue from '../../models/queue.schema';
import { botLog } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';

export const QKick: Command = {
    name: 'qkick',
    description: 'Remove AFK player from queue without adding a ban record',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to remove from queue',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'reason',
            description: 'Reason for removal (e.g., AFK)',
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const reason = (interaction.options.get('reason')?.value as string) || 'AFK';

        if (!mention) {
            return interaction.reply({ content: 'No user specified', ephemeral: true });
        }

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        // Check if user is in queue
        const queueSpot = await Queue.findOne({ discordId: mention.id });

        if (!queueSpot) {
            return interaction.reply({
                content: `<@${mention.id}> is not in the queue`,
                ephemeral: true,
            });
        }

        // Remove from queue (no ban record added)
        await Queue.deleteOne({ discordId: mention.id });

        // Log the action
        botLog({
            messageContent: `<@${user.id}> removed <@${mention.id}> from queue (QKick). Reason: ${reason}`,
            client,
        });

        // Create confirmation embed
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ User Removed from Queue')
            .addFields(
                { name: 'User', value: `<@${mention.id}>`, inline: true },
                { name: 'Removed By', value: `<@${user.id}>`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                {
                    name: 'Note',
                    value: '✅ No ban record added - user can re-queue immediately',
                    inline: false,
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
