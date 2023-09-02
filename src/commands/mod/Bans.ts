import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import Player from '../../models/player.schema';
import { getGuild } from '../../helpers/guild';
import { RanksType } from '../../types/channel';
import { getConfig } from '../../services/system.service';

export const Bans: Command = {
    name: 'bans',
    description: 'Get previous player bans',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to look at',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'no mention', ephemeral: true });
        const guild = await getGuild(client);

        const member = await guild.members.fetch(user.id);

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

        const player = await Player.findOne({ discordId: mention.id });
        if (!player) return interaction.reply({ content: 'no player', ephemeral: true });
        if (!player.bans || player.bans.length === 0)
            return interaction.reply({ content: 'no bans', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle(`${mention.username} bans`)
            .setColor('#0099ff')
            .setThumbnail(mention.avatarURL())
            .addFields([
                {
                    name: `Bans - ${player.bans.length}`,
                    value: `Currently banned until: ${
                        player.banEnd ? `<t:${Math.floor(player.banEnd / 1000)}:F>` : 'Not banned'
                    }`,
                },
                ...player.bans.map(ban => ({
                    name: `${ban.type} - ${ban.reason}`,
                    value: `Start: <t:${Math.floor(ban.startTime / 1000)}:F> - ${
                        ban.timeoutInMinutes
                    } minutes${ban.modId ? ` - By <@${ban.modId}>` : ''}`,
                })),
            ]);

        interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
