import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { botLog } from '../../helpers/messages';
import { getGuild } from '../../helpers/guild';
import { getConfig } from '../../services/system.service';
import { RanksType } from '../../types/channel';
import { handleAbandon } from '../Abandon';

export const ForceAbandon: Command = {
    name: 'force_abandon',
    description: 'If you absolutely have to leave the game, use this command to abandon it.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to abandon',
            required: true,
        },
    ],
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'No user mentioned', ephemeral: true });

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);
        if (!member) return;
        const config = await getConfig();
        const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;

        const isMod = await member.roles.cache.some(r => r.id === modRoleId);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }

        //check if in match channel
        handleAbandon({ interaction, user: mention, channelId, client });

        botLog({
            messageContent: `<@${user.id}> force abandonned <@${mention.id}>`,
            client,
        });
    },
};
