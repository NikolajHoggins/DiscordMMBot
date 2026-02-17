import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import * as matchService from '../services/match.service';
import { safelyReplyToInteraction } from '../helpers/interactions';

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
            required: true,
        },
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { channelId } = interaction;
        const code = interaction.options.get('code')?.value as string;
        const ign = interaction.options.get('ign')?.value as string;

        const match = await matchService.findByChannelId(channelId);
        if (!match) {
            await safelyReplyToInteraction({
                interaction,
                ephemeral: true,
                content: 'Command only works in match thread',
            });
            return;
        }

        const interactionResponse = await safelyReplyToInteraction({
            interaction,
            content: `<@&${match.roleId}> Lobby is on **${ign}**, code is **${code}**`,
        });
        if (!interactionResponse) return;
        const reply = await interactionResponse.fetch();

        setTimeout(() => {
            reply.reply(
                `<@&${match.roleId}> It's been 7 minutes, as per the rules, everyone should be in the lobby. If this is not the case, ping moderators, and remaining players will be force abandoned.`
            );
        }, 7 * 60 * 1000);
    },
};
