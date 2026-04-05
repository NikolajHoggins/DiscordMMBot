import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../Command';
import { checkRank } from '../../helpers/rank';

export const RefreshRankRoles: Command = {
    name: 'refresh_rank_roles',
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

        const guild = interaction.guild;

        if (!guild) return;

        const guildMembers = await guild.members.fetch();

        Promise.all(
            guildMembers.map(async member => {
                console.log('Checking rank for', member.user.id);

                return checkRank({ client, playerId: member.user.id }).then(r => {
                    console.log('done for', member.user.id);
                    return r;
                });
            })
        );

        await interaction.reply({ content: 'done', ephemeral: true });
        console.log('Done refreshing ranks');
    },
};
