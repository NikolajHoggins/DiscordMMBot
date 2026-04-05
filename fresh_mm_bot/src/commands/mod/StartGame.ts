import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Client,
    CommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { isUserMod } from '../../helpers/permissions';
import { botLog } from '../../helpers/messages';
import { findByChannelId, startGame } from '../../services/match.service';
import Match from '../../models/match.schema';

export const StartGame: Command = {
    name: 'start_game',
    description: 'Manually start a game for a match',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            name: 'match_number',
            description: 'Match number to start (optional; defaults to current thread)',
            type: ApplicationCommandOptionType.Integer,
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        const matchNumberOption = interaction.options.get('match_number')?.value as
            | number
            | undefined;
        const match = matchNumberOption
            ? await Match.findOne({ match_number: matchNumberOption })
            : await findByChannelId(channelId);

        if (!match) {
            await interaction.reply({
                content: 'Not in match thread or invalid match number',
                ephemeral: true,
            });
            return;
        }

        if (match.status === 'started') {
            await interaction.reply({
                content: `Match #${match.match_number} has already started`,
                ephemeral: true,
            });
            return;
        }

        botLog({
            messageContent: `<@${user.id}> manually started match ${match.match_number}`,
            client,
        });
        await interaction.reply({
            content: `Starting match #${match.match_number}...`,
            ephemeral: true,
        });
        await startGame({ client, matchNumber: match.match_number });
    },
};
