import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../Command';
import { runEloDecay } from '../../crons/eloDecay';

export const RunEloDecay: Command = {
    name: 'run_elo_decay',
    description: 'Run elo decay yo',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const HOGGINS_DISCORD_ID = '241759050155425803';
        if (user.id !== HOGGINS_DISCORD_ID)
            return interaction.reply({
                content: 'You are not authorized to use this command',
                ephemeral: true,
            });

        await runEloDecay(client);

        await interaction.reply({ content: 'done', ephemeral: true });
    },
};
