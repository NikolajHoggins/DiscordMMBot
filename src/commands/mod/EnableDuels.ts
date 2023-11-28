import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Client,
    CommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';

import { botLog } from '../../helpers/messages';
import { Command } from '../../Command';
import { isUserMod } from '../../helpers/permissions';
import { getConfig, updateConfig } from '../../services/system.service';

export const EnableDuels: Command = {
    name: 'enableduels',
    description: 'enable or disable duels',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.Boolean,
            name: 'enabled',
            description: 'True or false',
            required: true,
        },
    ],
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        const value = interaction.options.get('enabled')?.value;

        if (typeof value !== 'boolean')
            return interaction.reply({
                content: 'Type invalid',
                ephemeral: true,
            });

        botLog({
            messageContent: `<@${user.id}> ${value ? 'Enabled' : 'Disabled'} duels`,
            client,
        });

        const config = await getConfig();

        await updateConfig({ id: config._id, body: { duelsEnabled: value } });

        return interaction.reply({
            content: `Done`,
            ephemeral: true,
        });
    },
};
