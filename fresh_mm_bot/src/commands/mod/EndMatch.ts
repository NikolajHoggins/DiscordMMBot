import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../../Command';
import Match, { MatchStatus } from '../../models/match.schema';
import Player from '../../models/player.schema';
import { isUserMod } from '../../helpers/permissions';
import { botLog } from '../../helpers/messages';
import { gameTypeRatingKeys, GameType } from '../../types/queue';
import { safelyReplyToInteraction } from '../../helpers/interactions';

export const EndMatch: Command = {
    name: 'end_match',
    description: 'Null a match — terminates it without affecting Elo or rank stats',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            name: 'match_number',
            description: 'Match number to null',
            type: ApplicationCommandOptionType.Integer,
            required: true,
        },
        {
            name: 'reason',
            description: 'Reason for nulling this match',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],

    run: async (client: Client, interaction: CommandInteraction) => {
        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        const matchNumber = interaction.options.get('match_number')!.value as number;
        const reason = interaction.options.get('reason')!.value as string;

        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) {
            return safelyReplyToInteraction({
                interaction,
                content: `No match found with number **#${matchNumber}**.`,
                ephemeral: true,
            });
        }

        if (match.status === MatchStatus.nulled) {
            return safelyReplyToInteraction({
                interaction,
                content: `Match **#${matchNumber}** is already nulled.`,
                ephemeral: true,
            });
        }

        const wasScored = match.status === MatchStatus.ended;
        const gameType = match.gameType ?? GameType.squads;
        const keys = gameTypeRatingKeys[gameType];

        // Reverse elo for all players if the match was already scored
        let reversedCount = 0;
        if (wasScored) {
            for (const matchPlayer of match.players) {
                const player = await Player.findOne({ discordId: matchPlayer.id });
                if (!player) continue;

                const history: any[] = (player as any)[keys.history] ?? [];
                const entry = history.find((h: any) => h.matchNumber === matchNumber);
                if (!entry) continue;

                // Reverse the rating change and remove the history entry
                const ratingChange = entry.change ?? 0;
                const currentRating: number = (player as any)[keys.rating] ?? 1350;
                await Player.updateOne(
                    { discordId: matchPlayer.id },
                    {
                        $set: { [keys.rating]: Math.max(0, currentRating - ratingChange) },
                        $pull: { [keys.history]: { matchNumber } } as any,
                    }
                );
                reversedCount++;
            }
        }

        // Mark match as nulled
        await Match.updateOne(
            { match_number: matchNumber },
            { $set: { status: MatchStatus.nulled } }
        );

        // Build affected players list
        const playerList =
            match.players.length > 0
                ? match.players.map(p => `<@${p.id}>`).join(', ')
                : '*None recorded*';

        const embed = new EmbedBuilder()
            .setColor(0xcc0000)
            .setTitle('⛔  MATCH TERMINATED — NULLED')
            .addFields(
                { name: 'Match', value: `#${matchNumber}`, inline: true },
                { name: 'Status', value: 'NULLED', inline: true },
                { name: 'Game Type', value: gameType.toUpperCase(), inline: true },
                { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
                {
                    name: 'Elo Reversed',
                    value: wasScored
                        ? `Yes — ${reversedCount} player(s)`
                        : 'N/A (match was not scored)',
                    inline: true,
                },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Affected Players', value: playerList, inline: false }
            )
            .setFooter({ text: `Nulled by ${interaction.user.tag}` })
            .setTimestamp();

        await botLog({ client, messageContent: { embeds: [embed] } });

        return safelyReplyToInteraction({
            interaction,
            embeds: [embed],
            ephemeral: true,
        });
    },
};
