import { ButtonInteraction, Client } from 'discord.js';
import * as partyService from '../../services/party.service';
import { safelyReplyToInteraction } from '../../helpers/interactions';

export const handlePartyInviteInteraction = async (
    interaction: ButtonInteraction,
    client: Client
) => {
    const parts = interaction.customId.split('.');
    const action = parts[1]; // 'accept' or 'decline'
    const partyName = parts[2];
    const targetUserId = parts[3];

    if (interaction.user.id !== targetUserId) {
        return safelyReplyToInteraction({
            interaction,
            content: 'This invite is not for you',
            ephemeral: true,
        });
    }

    if (action === 'accept') {
        try {
            const party = await partyService.addMember(partyName, targetUserId);
            return safelyReplyToInteraction({
                interaction,
                content: `<@${targetUserId}> joined **${party.name}**!`,
            });
        } catch (error: any) {
            return safelyReplyToInteraction({
                interaction,
                content: error.message,
                ephemeral: true,
            });
        }
    }

    if (action === 'decline') {
        return safelyReplyToInteraction({
            interaction,
            content: `<@${targetUserId}> declined the invite to **${partyName}**`,
        });
    }
};
