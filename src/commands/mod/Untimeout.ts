import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import Player from '../../models/player.schema';
import { getGuild } from '../../helpers/guild';
import { getConfig } from '../../services/system.service';
import { RanksType } from '../../types/channel';
import { botLog } from '../../helpers/messages';

export const Untimeout: Command = {
    name: 'untimeout',
    description: 'Remove timeout from player',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to remove timeout from',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'no mention' });
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

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

        await Player.updateOne(
            { discordId: mention.id },
            {
                $set: { banEnd: 0 },
            }
        );

        botLog({
            messageContent: `<@${user.id}> untimouted <@${mention.id}>`,
            client,
        });

        interaction.reply({
            content: `Done`,
            ephemeral: true,
        });
    },
};
