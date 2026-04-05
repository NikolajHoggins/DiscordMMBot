import { ButtonInteraction, Client, EmbedBuilder } from 'discord.js';
import { isUserMod } from '../../helpers/permissions';
import { safelyReplyToInteraction } from '../../helpers/interactions';
import * as matchService from '../../services/match.service';
import { botLog } from '../../helpers/messages';

export const handleModConfirmInteraction = async (
    interaction: ButtonInteraction,
    client: Client
) => {
    const action = interaction.customId.split('.')[0]; // 'endgame' or 'restart'
    const subAction = interaction.customId.split('.')[1]; // 'confirm'

    // Check if user is a mod
    const isMod = await isUserMod(client, interaction);
    if (!isMod) {
        return safelyReplyToInteraction({
            interaction,
            content: 'You do not have permission to perform this action',
            ephemeral: true,
        });
    }

    if (action === 'endgame' && subAction === 'confirm') {
        const matchNumber = parseInt(interaction.customId.split('.')[2]);

        if (isNaN(matchNumber)) {
            return safelyReplyToInteraction({
                interaction,
                content: 'Invalid match number',
                ephemeral: true,
            });
        }

        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Match Ended')
            .setDescription(`Match #${matchNumber} has been force ended.`)
            .addFields({ name: 'Ended By', value: `<@${interaction.user.id}>`, inline: true })
            .setTimestamp();

        await interaction.update({
            embeds: [successEmbed],
            components: [],
        });

        botLog({
            messageContent: `<@${interaction.user.id}> confirmed and ended match ${matchNumber}`,
            client,
        });

        // End the match
        await matchService.end({ matchNumber, client, requeuePlayers: true });
    } else if (action === 'restart' && subAction === 'confirm') {
        // Update message to show restart is proceeding
        const restartEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔄 Bot Restarting')
            .setDescription(
                'Bot restart confirmed. The bot will restart now.\n\n⚠️ Active matches will be affected.'
            )
            .addFields({ name: 'Restarted By', value: `<@${interaction.user.id}>`, inline: true })
            .setTimestamp();

        await interaction.update({
            embeds: [restartEmbed],
            components: [],
        });

        botLog({
            messageContent: `<@${interaction.user.id}> confirmed bot restart with active matches`,
            client,
        });

        // Trigger restart
        process.exit(0);
    }
};
