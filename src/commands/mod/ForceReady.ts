import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Client,
    CommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import { setPlayerReady } from '../../listeners/buttonInteractions/handleMatchInteraction';
import { findByChannelId } from '../../services/match.service';
import { botLog } from '../../helpers/messages';
import { Command } from '../../Command';
import { isUserMod } from '../../helpers/permissions';
import Match from '../../models/match.schema';
import { safelyReplyToInteraction } from '../../helpers/interactions';

export const ForceReady: Command = {
    name: 'force_ready',
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
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        const player = interaction.options.getUser('player');
        if (!player) return interaction.reply({ content: 'Player not found', ephemeral: true });

        const match = await findByChannelId(interaction.channelId);
        if (!match) return interaction.reply({ content: 'Not in match channel', ephemeral: true });

        await setPlayerReady({
            playerId: player.id,
            matchNumber: match.match_number,
            client,
        });

        const messages = await interaction.channel?.messages.fetch();

        if (!messages)
            return safelyReplyToInteraction({
                interaction,
                content: 'No messages found, try again later',
                ephemeral: true,
            });

        for (const message of messages) {
            if (message[1].author.id === client.user?.id) {
                if (message[1].content.includes('Missing players')) {
                    setTimeout(async () => {
                        const newMatch = await Match.findOne({
                            match_number: match.match_number,
                        });
                        if (!newMatch) throw new Error('Match not found');
                        await message[1].edit(
                            'Missing players: ' +
                                newMatch.players
                                    .filter(p => !p.ready)
                                    .map(p => `<@${p.id}>`)
                                    .join(' ')
                        );
                    }, 2000);
                }
            }
        }

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
