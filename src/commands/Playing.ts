import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import Match from '../models/match.schema.js';
import { createMatchListEmbed } from '../helpers/embed.js';

export const PlayingCommand: Command = {
    name: 'playing',
    description: "See who's currently playing",
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const matches = await Match.find({ status: 'started' });

        if (!matches.length)
            return await interaction.reply({ content: 'No matches are currently being played' });

        const embed = await createMatchListEmbed({ matches });

        await interaction.reply({
            embeds: [embed],
        });
    },
};
