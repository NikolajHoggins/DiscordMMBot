import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Client,
    CommandInteraction,
} from 'discord.js';
import { setPlayerReady } from '../listeners/buttonInteractions/handleMatchInteraction';
import { findByChannelId } from '../services/match.service.js';
import { botLog } from '../helpers/messages.js';
import { Command } from '../Command.js';
import { isUserMod } from '../helpers/permissions.js';

export const ForceReady: Command = {
    name: 'forceready',
    description: 'Force a player to be ready',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'player',
            description: 'The player to force ready',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        if (!isUserMod(client, interaction)) return;

        const player = interaction.options.getUser('player');
        if (!player) return interaction.reply({ content: 'Player not found', ephemeral: true });

        const match = await findByChannelId(interaction.channelId);
        if (!match) return interaction.reply({ content: 'Not in match channel', ephemeral: true });

        await setPlayerReady({
            playerId: player.id,
            matchNumber: match.match_number,
            client,
        });

        botLog({
            messageContent: `<@${user.id}> force readied <@${player.id}>`,
            client,
        });

        return interaction.reply({
            content: `Player ${player.username} has been forced ready.`,
            ephemeral: true,
        });
    },
};
