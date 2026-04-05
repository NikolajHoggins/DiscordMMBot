import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import * as matchService from '../services/match.service';
import { safelyReplyToInteraction } from '../helpers/interactions';
import Match from '../models/match.schema';

const RATE_LIMIT_MS = 15_000;

export const CodeCommand: Command = {
    name: 'code',
    description: 'Share lobby code and host name',
    options: [
        {
            name: 'code',
            description: '4 digit lobby code',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'ign',
            description: 'In-game name of the host',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { channelId } = interaction;
        const code = interaction.options.get('code')?.value as string;
        const ign = (interaction.options.get('ign')?.value as string) || interaction.user.username;

        const match = await matchService.findByChannelId(channelId);
        if (!match) {
            await safelyReplyToInteraction({
                interaction,
                ephemeral: true,
                content: 'Command only works in match thread',
            });
            return;
        }

        if (match.codeSharedAt) {
            const elapsed = Date.now() - match.codeSharedAt;
            if (elapsed < RATE_LIMIT_MS) {
                const secondsLeft = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
                await safelyReplyToInteraction({
                    interaction,
                    ephemeral: true,
                    content: `Please wait ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''} before sharing a new code.`,
                });
                return;
            }
        }

        const channel = interaction.channel;
        if (!channel) return;

        await Match.updateOne(
            { match_number: match.match_number },
            { codeSharedAt: Date.now() }
        );

        await safelyReplyToInteraction({
            interaction,
            ephemeral: true,
            content: 'Lobby details shared!',
        });

        await channel.send(
            `<@&${match.roleId}> Lobby is on **${ign}**, code is **${code}**`
        );
    },
};
