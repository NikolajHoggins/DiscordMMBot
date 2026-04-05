import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../../Command';
import { isUserMod } from '../../helpers/permissions';
import Match, { MatchStatus } from '../../models/match.schema';
import * as matchService from '../../services/match.service';
import { botLog } from '../../helpers/messages';

export const MatchScoreOverride: Command = {
    name: 'match_score_override',
    description: 'Override match scores and close the match',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            type: ApplicationCommandOptionType.Integer,
            name: 'match_id',
            description: 'Match number to override',
            required: true,
            min_value: 1,
        },
        {
            type: ApplicationCommandOptionType.Integer,
            name: 'score_a',
            description: 'Score for Team A',
            required: true,
            min_value: 0,
            max_value: 99,
        },
        {
            type: ApplicationCommandOptionType.Integer,
            name: 'score_b',
            description: 'Score for Team B',
            required: true,
            min_value: 0,
            max_value: 99,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        const matchId = interaction.options.get('match_id')?.value as number;
        const scoreA = interaction.options.get('score_a')?.value as number;
        const scoreB = interaction.options.get('score_b')?.value as number;

        if (matchId === undefined || scoreA === undefined || scoreB === undefined) {
            return interaction.reply({
                content: 'Please provide all required parameters',
                ephemeral: true,
            });
        }

        // Find the match
        const match = await Match.findOne({ match_number: matchId });

        if (!match) {
            return interaction.reply({
                content: `Match #${matchId} not found`,
                ephemeral: true,
            });
        }

        if (match.status === MatchStatus.ended) {
            return interaction.reply({
                content: `Match #${matchId} has already ended`,
                ephemeral: true,
            });
        }

        // Update scores directly in database
        await Match.updateOne(
            { match_number: matchId },
            {
                $set: {
                    teamARounds: scoreA,
                    teamBRounds: scoreB,
                    status: MatchStatus.started, // Ensure it's in started state for proper end handling
                },
            }
        );

        botLog({
            messageContent: `<@${user.id}> overrode scores for match #${matchId}: Team A: ${scoreA} - Team B: ${scoreB}`,
            client,
        });

        // Create confirmation embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Scores Overridden')
            .setDescription(`Match #${matchId} scores have been updated and match will be closed.`)
            .addFields(
                { name: 'Team A Score', value: scoreA.toString(), inline: true },
                { name: 'Team B Score', value: scoreB.toString(), inline: true },
                { name: 'Updated By', value: `<@${user.id}>`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [confirmEmbed],
            ephemeral: true,
        });

        // End the match (this will handle ELO calculations and cleanup)
        setTimeout(async () => {
            try {
                await matchService.end({
                    matchNumber: matchId,
                    client,
                    requeuePlayers: false,
                });
                botLog({
                    messageContent: `Match #${matchId} closed after score override`,
                    client,
                });
            } catch (error) {
                botLog({
                    messageContent: `Error closing match #${matchId} after override: ${error}`,
                    client,
                });
            }
        }, 2000); // Small delay to ensure embed is sent first
    },
};
