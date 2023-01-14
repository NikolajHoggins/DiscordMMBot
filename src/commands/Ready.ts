import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    TextChannel,
    Channel,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { ready } from '../services/queue.service';

export const Ready: Command = {
    name: 'ready',
    description: 'Ready up for a game',
    options: [
        {
            name: 'time',
            description: 'set how many minutes you want to be in queue',
            type: ApplicationCommandOptionType.Number,
            required: false,
        },
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const TESTING_CHANNEL = '1063592233779073105';
        if (
            interaction.channelId !== TESTING_CHANNEL &&
            interaction.channelId !== process.env.QUEUE_CHANNEL
        ) {
            interaction.user.send('queue commands only available in #queue');
            return;
        }
        //fetch player from database
        const { user } = interaction;
        const player = await playerService.findOrCreate(user);

        const option = interaction.options.get('time');
        const isNumber = typeof option?.value == 'number';
        const readyTime = isNumber ? (option.value as number) : 30;

        ready({ player, time: readyTime });

        const content = `You have been set to be ready for a match for ${readyTime} minutes.`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
