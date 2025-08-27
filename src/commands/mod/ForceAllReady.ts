import {
    ApplicationCommandType,
    Client,
    CommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { isUserMod } from '../../helpers/permissions';
import { findByChannelId } from '../../services/match.service';
import { setPlayerReady } from '../../listeners/buttonInteractions/handleMatchInteraction';
import Match from '../../models/match.schema';
import { botLog } from '../../helpers/messages';

export const ForceAllReady: Command = {
    name: 'force_all_ready',
    description: 'Force everyone in the current match to be ready',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        const match = await findByChannelId(interaction.channelId);
        if (!match) {
            await interaction.reply({
                content: 'Command only works in match thread',
                ephemeral: true,
            });
            return;
        }

        const notReadyPlayers = match.players.filter(p => !p.ready);
        if (notReadyPlayers.length === 0) {
            await interaction.reply({ content: "Everyone's already ready", ephemeral: true });
            return;
        }

        await Promise.all(
            notReadyPlayers.map(player =>
                setPlayerReady({
                    playerId: player.id,
                    matchNumber: match.match_number,
                    client,
                })
            )
        );

        // Update the missing players message in the thread, if present
        const messages = await interaction.channel?.messages.fetch();
        if (messages) {
            for (const message of messages) {
                if (message[1].author.id === client.user?.id) {
                    if (message[1].content.includes('Missing players')) {
                        setTimeout(async () => {
                            const newMatch = await Match.findOne({
                                match_number: match.match_number,
                            });
                            if (!newMatch) throw new Error('Match not found');
                            const missingPlayers = newMatch.players.filter(p => !p.ready);
                            await message[1].edit(
                                missingPlayers.length === 0
                                    ? "Everyone's ready, starting soon"
                                    : 'Missing players: ' +
                                          missingPlayers.map(p => `<@${p.id}>`).join(' ')
                            );
                        }, 2000);
                    }
                }
            }
        }

        botLog({
            messageContent: `<@${interaction.user.id}> force readied all in match ${match.match_number}`,
            client,
        });

        await interaction.reply({ content: 'Forced all players ready.', ephemeral: true });
    },
};
