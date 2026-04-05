import {
    ButtonInteraction,
    Client,
    ChannelType,
    EmbedBuilder,
    TextChannel,
    VoiceChannel,
} from 'discord.js';
import Player from '../../models/player.schema';

export const handleResetSeasonInteraction = async (
    interaction: ButtonInteraction,
    client: Client
) => {
    const subAction = interaction.customId.split('.')[1]; // 'confirm' | 'cancel'

    if (subAction === 'cancel') {
        const cancelEmbed = new EmbedBuilder()
            .setTitle('Reset Cancelled')
            .setColor('#808080')
            .setDescription('Season reset was cancelled. No changes were made.')
            .setTimestamp();

        await interaction.update({ embeds: [cancelEmbed], components: [] });
        return;
    }

    if (subAction === 'confirm') {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Resetting Season...')
                    .setColor('#FF9900')
                    .setDescription('Processing database reset and channel cleanup.')
                    .setTimestamp(),
            ],
            components: [],
        });

        try {
            // Reset all player ratings and history
            await Player.updateMany(
                {},
                {
                    $set: {
                        rating: 1000,
                        duelsRating: 1000,
                        history: [],
                        ratingHistory: [],
                        duelsHistory: [],
                        duelsRatingHistory: [],
                    },
                }
            );

            // Find matches-played channel by name in the guild
            let channelStatus = 'matches-played channel not found';
            const guild = interaction.guild;
            if (guild) {
                const target = guild.channels.cache.find(
                    c =>
                        c.name === 'matches-played' &&
                        (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
                ) as TextChannel | VoiceChannel | undefined;

                if (target) {
                    const cloned = await target.clone();
                    await (cloned as TextChannel | VoiceChannel).setPosition(target.rawPosition);
                    await target.delete('Season reset executed by admin');
                    channelStatus = `<#${cloned.id}> cleared and recreated`;
                }
            }

            const successEmbed = new EmbedBuilder()
                .setTitle('Season Reset Complete')
                .setColor('#00CC44')
                .addFields(
                    {
                        name: 'Database',
                        value: 'All player ratings reset to **1000** — history, wins, and losses cleared',
                        inline: false,
                    },
                    {
                        name: 'Matches-Played Channel',
                        value: channelStatus,
                        inline: false,
                    }
                )
                .setFooter({ text: `Reset executed by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed], components: [] });
        } catch (err) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Reset Failed')
                .setColor('#FF0000')
                .setDescription(`An error occurred during the reset:\n\`\`\`${err}\`\`\``)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed], components: [] });
        }
    }
};
