import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import Player from '../models/player.schema.js';
import { getGuild } from '../helpers/guild.js';

export const Bans: Command = {
    name: 'bans',
    description: 'Get player bans?',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to timeout',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        console.log('mention', mention);
        if (!mention) return interaction.reply({ content: 'no mention', ephemeral: true });
        const guild = await getGuild(client);

        const member = await guild.members.fetch(user.id);
        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
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
            .addFields({
                name: `Bans - ${player.bans.length}`,
                value: player.bans
                    .map(
                        ban =>
                            `${ban.type} - <t:${Math.floor(ban.startTime / 1000)}:F> - ${
                                ban.reason
                            }`
                    )
                    .join('\n'),
            });

        interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
