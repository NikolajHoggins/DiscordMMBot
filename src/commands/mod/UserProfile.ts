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
import { isUserMod } from '../../helpers/permissions';
import { formatDuration } from '../../helpers/duration';

export const UserProfile: Command = {
    name: 'user_profile',
    description: 'View comprehensive user profile with bans, notes, and account info',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to view profile for',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'No user specified', ephemeral: true });

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        // Fetch the Discord user
        const discordUser = await client.users.fetch(mention.id);
        const guildMember = await interaction.guild?.members.fetch(mention.id);

        // Fetch player data from database
        const player = await Player.findOne({ discordId: mention.id });

        // Create the embed
        const embed = new EmbedBuilder()
            .setTitle(`📋 User Profile: ${mention.username}`)
            .setColor('#0099ff')
            .setThumbnail(mention.avatarURL())
            .setTimestamp();

        // Account Info Section
        const accountCreated = discordUser.createdAt;
        const accountAge = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));
        const joinedServer = guildMember?.joinedAt;
        const memberDuration = joinedServer
            ? Math.floor((Date.now() - joinedServer.getTime()) / (1000 * 60 * 60 * 24))
            : 'N/A';

        embed.addFields({
            name: '👤 Account Information',
            value: [
                `**Discord ID:** ${mention.id}`,
                `**Account Created:** <t:${Math.floor(accountCreated.getTime() / 1000)}:F> (${accountAge} days ago)`,
                `**Joined Server:** ${
                    joinedServer
                        ? `<t:${Math.floor(joinedServer.getTime() / 1000)}:F> (${memberDuration} days ago)`
                        : 'Unknown'
                }`,
            ].join('\n'),
            inline: false,
        });

        if (!player) {
            embed.addFields({
                name: '⚠️ Player Status',
                value: 'User has not registered for matchmaking yet.',
                inline: false,
            });

            return interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        // Active Ban Status
        const isCurrentlyBanned = player.banEnd && player.banEnd > Date.now();
        if (isCurrentlyBanned) {
            const banTimeRemaining = Math.floor((player.banEnd - Date.now()) / (1000 * 60));
            embed.addFields({
                name: '🚫 Active Ban',
                value: [
                    `**Status:** ⛔ BANNED`,
                    `**Expires:** <t:${Math.floor(player.banEnd / 1000)}:R>`,
                    `**Time Remaining:** ${formatDuration(banTimeRemaining)}`,
                ].join('\n'),
                inline: false,
            });
        } else {
            embed.addFields({
                name: '✅ Ban Status',
                value: 'Not currently banned',
                inline: false,
            });
        }

        // Bans History Section
        if (player.bans && player.bans.length > 0) {
            const recentBans = player.bans.slice(-5).reverse(); // Last 5 bans
            const bansList = recentBans
                .map(
                    ban =>
                        `• **${ban.type}** - ${formatDuration(ban.timeoutInMinutes)}\n  Reason: ${
                            ban.reason
                        }\n  <t:${Math.floor(ban.startTime / 1000)}:R>${
                            ban.modId ? ` by <@${ban.modId}>` : ''
                        }`
                )
                .join('\n\n');

            embed.addFields({
                name: `📜 Recent Ban History (${player.bans.length} total)`,
                value: bansList.length > 0 ? bansList : 'No bans recorded',
                inline: false,
            });
        }

        // Staff Notes Section
        if (player.notes && player.notes.length > 0) {
            const recentNotes = player.notes.slice(-5).reverse(); // Last 5 notes
            const notesList = recentNotes
                .map(
                    note =>
                        `• <@${note.modId}> - <t:${Math.floor(note.time / 1000)}:R>\n  ${note.note}`
                )
                .join('\n\n');

            embed.addFields({
                name: `📝 Staff Notes (${player.notes.length} total)`,
                value: notesList.length > 0 ? notesList : 'No notes recorded',
                inline: false,
            });
        } else {
            embed.addFields({
                name: '📝 Staff Notes',
                value: 'No notes recorded',
                inline: false,
            });
        }

        // Additional Stats
        embed.addFields({
            name: '📊 Matchmaking Stats',
            value: [
                `**Rating:** ${Math.round(player.rating)}`,
                `**Matches Played:** ${player.history?.length || 0}`,
                `**Ban Multiplier:** ${player.banMultiplier || 0}x`,
            ].join('\n'),
            inline: false,
        });

        interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
