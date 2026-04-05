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

export const ResetSeason: Command = {
    name: 'reset_season',
    description: 'Hard reset all player ratings, history, and match channel (Admin only)',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
    run: async (_client: Client, interaction: CommandInteraction) => {
        const confirmEmbed = new EmbedBuilder()
            .setTitle('Season Reset Confirmation')
            .setColor('#FF9900')
            .setDescription(
                '**This action cannot be undone.**\n\n' +
                    'This will:\n' +
                    '• Reset **all** player ratings to **1000**\n' +
                    '• Clear all match history, wins, and losses\n' +
                    '• Purge all messages in the matches-played channel\n\n' +
                    'Are you sure you want to proceed?'
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('resetseason.confirm')
                .setLabel('Yes, Reset Season')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('resetseason.cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            embeds: [confirmEmbed],
            components: [row],
            ephemeral: true,
        });
    },
};
