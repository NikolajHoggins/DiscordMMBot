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
import * as enforcementService from '../services/enforcement.service';
import { getRankName } from '../helpers/rank';
import Player from '../models/player.schema';
import { safelyReplyToInteraction } from '../helpers/interactions';
import { formatDuration } from '../helpers/duration';
import { EnforcementStatus } from '../models/enforcement.schema';

export const Lookup: Command = {
    name: 'lookup',
    description: 'Look up a player profile with username, rank, rating, and enforcement history',
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
        const userToCheck = mention || user;

        const player = await playerService.findOrCreate(userToCheck);

        if (player.name !== userToCheck.username) {
            await Player.updateOne({ discordId: userToCheck.id }, { name: userToCheck.username });
            player.name = userToCheck.username;
        }

        // Get display name
        let displayName = player.name;
        try {
            const guild = interaction.guild;
            if (guild) {
                const member = await guild.members.fetch(userToCheck.id);
                displayName = member.displayName;
            }
        } catch {}

        const { history } = player;
        const isUnranked = history.length < 10;
        const rankName = isUnranked ? 'Unranked' : getRankName(player.rating);
        const playerRating = isUnranked
            ? '*Play 10 matches to get ranked*'
            : `${floor(player.rating)}`;

        const historyNoAbandon = history.filter(match => match.result !== 'abandon');
        const wins = historyNoAbandon.filter(m => m.result === 'win').length;
        const losses = historyNoAbandon.filter(m => m.result === 'loss').length;
        const winRate =
            historyNoAbandon.length > 0
                ? `${Math.round((wins / historyNoAbandon.length) * 100)}%`
                : 'N/A';

        // Last 10 match IDs
        const last10 = historyNoAbandon.slice(-10).reverse();
        const matchIdList =
            last10.length > 0
                ? last10
                      .map(
                          m =>
                              `\`#${m.matchNumber}\` ${m.result === 'win' ? '🟢' : '🔴'} ${m.change > 0 ? '+' : ''}${Math.round(m.change)}`
                      )
                      .join('\n')
                : '*No matches played yet*';

        // ── Embed 1: Player Profile ──────────────────────────────────────
        const isCurrentlyBanned = player.banEnd && player.banEnd > Date.now();

        const profileEmbed = new EmbedBuilder()
            .setTitle(`${displayName} (@${player.name})`)
            .setDescription(`\`${userToCheck.id}\``)
            .setColor('#0099ff')
            .setThumbnail(userToCheck.avatarURL())
            .addFields(
                { name: 'Rank', value: rankName, inline: true },
                { name: 'Elo', value: playerRating, inline: true },
                { name: 'Matches', value: `${historyNoAbandon.length}`, inline: true },
                { name: 'Wins', value: `${wins}`, inline: true },
                { name: 'Losses', value: `${losses}`, inline: true },
                { name: 'Win Rate', value: winRate, inline: true },
                { name: 'Last 10 Games', value: matchIdList, inline: false }
            )
            .setTimestamp();

        if (isCurrentlyBanned) {
            profileEmbed.addFields({
                name: '🚫 Currently Suspended',
                value: `Expires <t:${Math.floor(player.banEnd / 1000)}:R> (<t:${Math.floor(player.banEnd / 1000)}:F>)`,
                inline: false,
            });
        }

        const embeds: EmbedBuilder[] = [profileEmbed];

        // ── Enforcements ─────────────────────────────────────────────────
        const enforcements = await enforcementService.getEnforcementsForUser(userToCheck.id);

        const active = enforcements.filter(e => e.status === EnforcementStatus.active);
        const priors = enforcements.filter(e => e.status !== EnforcementStatus.active);

        const formatEnforcement = (e: any): string => {
            const typeLabel = e.type === 'mod' ? 'Manual Timeout' : `Auto (${e.type})`;
            const lines = [
                `**${typeLabel}** — ${formatDuration(e.durationMinutes)}`,
                `Reason: ${e.reason}`,
                `By: <@${e.modId}> — <t:${Math.floor(e.createdAt / 1000)}:f>`,
                `Expires: <t:${Math.floor(e.expiresAt / 1000)}:F>`,
            ];
            if (e.modNotes) lines.push(`Notes: *${e.modNotes}*`);
            if (e.status === EnforcementStatus.voided)
                lines.push(`**VOIDED** by <@${e.voidedBy}>: ${e.voidReason}`);
            return lines.join('\n');
        };

        // Active enforcements embed (red)
        if (active.length > 0) {
            const activeEmbed = new EmbedBuilder()
                .setTitle('🚫 ACTIVE ENFORCEMENTS')
                .setColor('#FF0000');

            active.forEach((e, i) => {
                activeEmbed.addFields({
                    name: `#${i + 1}`,
                    value: formatEnforcement(e),
                    inline: false,
                });
            });

            embeds.push(activeEmbed);
        }

        // Prior enforcements embed (orange)
        if (priors.length > 0) {
            const priorEmbed = new EmbedBuilder()
                .setTitle('📋 PRIOR ENFORCEMENTS')
                .setColor('#FF6B00')
                .setFooter({
                    text: `${priors.length} prior enforcement${priors.length !== 1 ? 's' : ''}`,
                });

            priors.forEach((e, i) => {
                priorEmbed.addFields({
                    name: `#${i + 1} — ${e.status.toUpperCase()}`,
                    value: formatEnforcement(e),
                    inline: false,
                });
            });

            embeds.push(priorEmbed);
        }

        if (active.length === 0 && priors.length === 0) {
            profileEmbed.addFields({
                name: '✅ Enforcement History',
                value: 'No enforcements on record',
                inline: false,
            });
        }

        return safelyReplyToInteraction({
            interaction,
            embeds,
            ephemeral: true,
        });
    },
};
