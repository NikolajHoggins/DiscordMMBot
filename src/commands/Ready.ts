import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ButtonInteraction,
} from 'discord.js';
import { Command } from '../Command';
import { updateStatus } from '../crons/updateQueue';
import * as playerService from '../services/player.service';
import { ready } from '../services/queue.service';
import { getConfig } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import Match from '../models/match.schema.js';
import { sendMessage } from '../helpers/messages.js';
import { ceil } from 'lodash';

export const handleReady = async ({
    interaction,
    time,
    client,
}: {
    interaction: CommandInteraction | ButtonInteraction;
    time: number;
    client: Client;
}) => {
    //fetch player from database
    const { user } = interaction;
    const player = await playerService.findOrCreate(user);

    if (player.banEnd > Date.now()) {
        interaction.reply({
            content: `You are banned from queue for ${ceil(
                (player.banEnd - Date.now()) / 1000 / 60
            )} minutes`,
            ephemeral: true,
        });
        return;
    }

    //Check if match with player on it is in progress
    const match = await Match.findOne({ 'players.id': user.id, status: { $ne: 'ended' } });

    if (match) {
        interaction.reply({
            content: `You are already in a match`,
            ephemeral: true,
        });
        return;
    }

    await ready({ player, time: time });
    await updateStatus(client);

    const content = `You have been set to be ready for a match for ${time} minutes.`;

    await interaction.reply({
        ephemeral: true,
        content,
    });

    const queueChannelId = await getConfig().then(
        config => config.channels.find(c => c.name === ChannelsType['ranked-queue'])?.id
    );
    if (!queueChannelId) throw new Error('Queue channel not found');
    await sendMessage({
        channelId: queueChannelId,
        messageContent: `${player.name} readied up!`,
        client,
    });
};

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
            await interaction.reply({
                ephemeral: true,
                content: 'Keep queue commands in queue',
            });
            return;
        }
        const option = interaction.options.get('time');
        const isNumber = typeof option?.value == 'number';
        const readyTime = isNumber ? (option.value as number) : 30;

        handleReady({ interaction, time: readyTime, client });

        //If all players are in queue, send a "stratingw within the next minute message" maybe even seconds (in x seconds)
    },
};
