import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { floor } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getRankName } from '../helpers/rank';
import Player from '../models/player.schema';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import { safelyReplyToInteraction } from '../helpers/interactions';
import { formatDuration } from '../helpers/duration';

export const Lookup: Command = {
    name: 'lookup',
    description: 'Look up a player profile with username, rank, rating, and suspension history',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to look up',
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;

        const queueChannel = await getChannelId(ChannelsType['bot-commands']);
        if (interaction.channelId !== queueChannel) {
            return safelyReplyToInteraction({
                interaction,
                content: `Keep messages in <#${queueChannel}> channel`,
                ephemeral: true,
            });
        }

        const userToCheck = mention || user;
        const player = await playerService.findOrCreate(userToCheck);

        // Update player name if it has changed
        if (player.name !== userToCheck.username) {
            await Player.updateOne({ discordId: userToCheck.id }, { name: userToCheck.username });
            player.name = userToCheck.username;
        }

        const { history } = player;
        const isUnranked = history.length < 10;
        const rankName = isUnranked ? 'Unranked' : getRankName(player.rating);
        const playerRating = isUnranked ? 'Play 10 matches to get ranked' : floor(player.rating);

        const historyNoAbandon = history.filter(match => match.result !== 'abandon');

        // Create the embed
        const lookupEmbed = new EmbedBuilder()
            .setTitle(`🔍 Player Lookup: ${player.name}`)
            .setColor('#0099ff')
            .setThumbnail(userToCheck.avatarURL())
            .setTimestamp();

        // Basic Information
        lookupEmbed.addFields({
            name: '👤 Basic Information',
            value: [
                `**Username:** ${player.name}`,
                `**Discord ID:** ${player.discordId}`,
                `**Rank:** ${rankName}`,
                `**Rating:** ${playerRating}`,
                `**Matches Played:** ${historyNoAbandon.length}`,
            ].join('\n'),
            inline: false,
        });

        // Current Ban Status
        const isCurrentlyBanned = player.banEnd && player.banEnd > Date.now();
        if (isCurrentlyBanned) {
            const banTimeRemaining = Math.floor((player.banEnd - Date.now()) / (1000 * 60));
            lookupEmbed.addFields({
                name: '🚫 Current Suspension',
                value: [
                    `**Status:** ⛔ SUSPENDED`,
                    `**Expires:** <t:${Math.floor(player.banEnd / 1000)}:R>`,
                    `**Time Remaining:** ${formatDuration(banTimeRemaining)}`,
                ].join('\n'),
                inline: false,
            });
        } else {
            lookupEmbed.addFields({
                name: '✅ Suspension Status',
                value: 'Not currently suspended',
                inline: false,
            });
        }

        // Suspension History
        if (player.bans && player.bans.length > 0) {
            const recentBans = player.bans.slice(-5).reverse(); // Last 5 suspensions
            const bansList = recentBans
                .map(
                    ban =>
                        `• **${ban.type}** - ${formatDuration(ban.timeoutInMinutes)}\n  Reason: ${
                            ban.reason
                        } - <t:${Math.floor(ban.startTime / 1000)}:R>`
                )
                .join('\n\n');

            lookupEmbed.addFields({
                name: `📜 Suspension History (${player.bans.length} total)`,
                value: bansList.length > 0 ? bansList : 'No suspensions recorded',
                inline: false,
            });
        } else {
            lookupEmbed.addFields({
                name: '📜 Suspension History',
                value: 'No suspensions recorded',
                inline: false,
            });
        }

        return safelyReplyToInteraction({
            interaction,
            embeds: [lookupEmbed],
            ephemeral: false,
        });
    },
};
