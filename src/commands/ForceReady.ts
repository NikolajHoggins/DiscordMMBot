import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Client,
    CommandInteraction,
} from 'discord.js';
import { setPlayerReady } from '../listeners/buttonInteractions/handleMatchInteraction';
import { getConfig } from '../services/system.service.js';
import { findByChannelId } from '../services/match.service.js';
import { RanksType } from '../types/channel.js';
import { botLog } from '../helpers/messages.js';
import { Command } from '../Command.js';

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
    permissions: [
        {
            id: process.env.MOD_ROLE_ID || '123123', // replace with your mod role id
            type: 'ROLE',
            permission: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        // Fetch the mod-role-id from the database
        const { user } = interaction;

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
