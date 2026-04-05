import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import { Command } from '../../Command';
import { getGuild } from '../../helpers/guild';
import { getConfig } from '../../services/system.service';
import { RanksType } from '../../types/channel';
import { isUserMod } from '../../helpers/permissions';
import Match, { MatchStatus } from '../../models/match.schema';

export const RestartBot: Command = {
    name: 'restart_bot',
    description: 'Restart the bot, only for mods',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user } = interaction;

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        if (!member) return;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        // Check for active matches
        const activeMatches = await Match.countDocuments({
            status: { $ne: MatchStatus.ended },
        });

        if (activeMatches > 0) {
            // Show warning with confirmation
            const warningEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Active Matches Detected')
                .setDescription(
                    `There are **${activeMatches}** match${activeMatches !== 1 ? 'es' : ''} currently live.\n\nRestarting will break these matches and may cause issues for players.\n\n**Are you sure you want to proceed?**`
                )
                .addFields({
                    name: 'Impact',
                    value: '• Match channels will remain but bot will disconnect\n• Players may need to manually resolve matches\n• Queue data will be lost',
                })
                .setTimestamp();

            const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('restart.confirm')
                    .setLabel('Confirm Restart')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                embeds: [warningEmbed],
                components: [row],
                ephemeral: true,
            });
        } else {
            // No active matches, proceed immediately
            await interaction.reply({
                content: '✅ No active matches. Restarting bot...',
                ephemeral: true,
            });
            throw new Error('Restarting bot');
        }
    },
};
