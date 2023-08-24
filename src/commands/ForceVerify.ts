import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { findByChannelId } from '../services/match.service.js';
import { MatchStatus } from '../models/match.schema.js';
import { finishMatch } from '../services/match.service.js';
import { botLog } from '../helpers/messages.js';
import { isUserMod } from '../helpers/permissions.js';

export const ForceVerify: Command = {
    name: 'force_verify',
    description: 'Force verify a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;

        if (!isUserMod(client, interaction)) return;

        const match = await findByChannelId(channelId);
        if (!match) {
            await interaction.reply({
                ephemeral: true,
                content: 'Command only works in match thread',
            });
            return;
        }
        if (match.status !== MatchStatus.started) {
            await interaction.reply({
                ephemeral: true,
                content: 'Match not in started state',
            });
            return;
        }
        if (match.teamARounds === undefined || match.teamBRounds === undefined) {
            await interaction.reply({
                ephemeral: true,
                content: 'Match scores not submitted',
            });
            return;
        }
        await finishMatch({
            matchNumber: match.match_number,
            client: client,
        });

        botLog({
            messageContent: `<@${user.id}> force verified match ${match.match_number}`,
            client,
        });

        await interaction.reply({
            content: 'Match verified',
        });
    },
};
