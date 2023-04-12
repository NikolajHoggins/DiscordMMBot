import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    TextChannel,
    Channel,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { updateStatus } from '../crons/updateQueue';
import { tryStart } from '../services/match.service';
import * as playerService from '../services/player.service';
import { ready } from '../services/queue.service';
import { getConfig } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import Match from '../models/match.schema.js';

export const Ready: Command = {
    name: 'ready',
    description: 'Ready up for a game',
    options: [
        {
            name: 'time',
            description: 'set how many minutes you want to be in queue',
            type: ApplicationCommandOptionType.Number,
            required: false,
            min_value: 5,
            max_value: 120,
        },
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const config = await getConfig();

        const TESTING_CHANNEL = '1063592233779073105';
        if (
            interaction.channelId !== TESTING_CHANNEL &&
            interaction.channelId !==
                config.channels.filter((c: any) => c.name === ChannelsType['ranked-queue'])[0].id
        ) {
            await interaction.followUp({
                ephemeral: true,
                content: 'Keep queue commands in queue',
            });
            return;
        }
        //fetch player from database
        const { user } = interaction;
        const player = await playerService.findOrCreate(user);

        //Check if match with player on it is in progress
        const match = await Match.findOne({ 'players.id': user.id, status: { $ne: 'ended' } });

        if (match) {
            interaction.followUp({
                content: `You are already in a match`,
                ephemeral: true,
            });
            return;
        }

        const option = interaction.options.get('time');
        const isNumber = typeof option?.value == 'number';
        const readyTime = isNumber ? (option.value as number) : 30;

        await ready({ player, time: readyTime });
        await updateStatus(client);
        await tryStart(client);

        const content = `You have been set to be ready for a match for ${readyTime} minutes.`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
