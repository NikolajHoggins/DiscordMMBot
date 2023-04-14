import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { ceil, floor } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getRankName } from '../helpers/rank.js';
import Player from '../models/player.schema.js';
import Queue from '../models/queue.schema.js';

export const Timeout: Command = {
    name: 'timeout',
    description: 'Get player stats?',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to timeout',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Number,
            name: 'duration',
            description: 'timeout in minutes',
            min_value: 1,
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const durationValue = interaction.options.get('duration')?.value as number;
        if (!durationValue) return interaction.reply({ content: 'provide timeout time' });

        if (!mention) return interaction.reply({ content: 'no mention' });

        const player = await playerService.findOrCreate(mention);
        if (!player) return interaction.reply({ content: `User not found` });

        //Make sure to remove user from queue if they are.
        await Queue.deleteOne({ discordId: mention.id });

        const now = Date.now();
        const timeoutEnd = now + durationValue * 60 * 1000;
        await Player.updateOne(
            { discordId: mention.id },
            { $set: { banStart: durationValue, banEnd: timeoutEnd } }
        );

        interaction.reply({ content: `player has been timed out for ${durationValue} minutes` });
    },
};
