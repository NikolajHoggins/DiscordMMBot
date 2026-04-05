import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { postAimHero } from '../../crons/postAimHero';

export const PostAimHero: Command = {
    name: 'post_aim_hero',
    description: 'Post the VR AIM promo in ranked queue',
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

        await postAimHero(client);
        await interaction.reply({ content: 'Posted.', ephemeral: true });
    },
};
