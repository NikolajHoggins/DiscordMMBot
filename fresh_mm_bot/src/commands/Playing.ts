import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import Match from '../models/match.schema';
import { createMatchListEmbed } from '../helpers/embed';
import { safelyReplyToInteraction } from '../helpers/interactions';

export const PlayingCommand: Command = {
    name: 'playing',
    description: "See who's currently playing",
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const matches = await Match.find({ status: 'started' });

        if (!matches.length)
            return await safelyReplyToInteraction({
                interaction,
                content: 'No matches are currently being played',
            });

        const embed = await createMatchListEmbed({ matches });

        await safelyReplyToInteraction({
            interaction,
            embeds: [embed],
        });
    },
};
