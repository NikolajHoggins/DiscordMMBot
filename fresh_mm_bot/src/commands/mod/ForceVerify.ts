import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { findByChannelId } from '../../services/match.service';
import { MatchStatus } from '../../models/match.schema';
import { finishMatch } from '../../services/match.service';
import { botLog } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';

export const ForceVerify: Command = {
    name: 'force_verify',
    description: 'Force verify a game',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

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
