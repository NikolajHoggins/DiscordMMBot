import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
    ApplicationCommandOptionType,
} from 'discord.js';

import { Command } from '../../Command';
import { sendDirectMessage } from '../../helpers/messages';

export const SendDM: Command = {
    name: 'dm',
    description: 'Send a direct message to a user',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to DM',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'message',
            description: 'Message to send',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        console.log('DM command');
        const userId = interaction.options.get('user')?.value;
        const message = interaction.options.get('message')?.value;

        if (typeof userId !== 'string' || typeof message !== 'string')
            return interaction.reply({ content: 'Invalid input', ephemeral: true });

        try {
            const user = await client.users.fetch(userId);
            await sendDirectMessage({ client, userId, message });
            await interaction.reply({ content: `Sent DM to <@${userId}>`, ephemeral: true });
        } catch (error) {
            await interaction.reply({
                content: 'Failed to send DM. The user may have DMs disabled.',
                ephemeral: true,
            });
        }
    },
};
