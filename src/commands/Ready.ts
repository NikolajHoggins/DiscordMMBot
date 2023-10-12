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
import { ChannelsType, RanksType } from '../types/channel';
import { sendMessage } from '../helpers/messages';
import { ceil } from 'lodash';
import { GameType, RegionsType, gameTypeQueueChannels } from '../types/queue';

export const handleReady = async ({
    interaction,
    time,
    client,
    region,
    gameType,
}: {
    interaction: CommandInteraction | ButtonInteraction;
    time: number;
    region: RegionsType;
    client: Client;
    gameType: GameType;
}) => {
    //fetch player from database
    const { user } = interaction;
    const player = await playerService.findOrCreate(user);
    const guildMember = await interaction.guild?.members.fetch(user.id);
    if (!guildMember) throw new Error('Guild member not found');
    const userRoles = guildMember.roles.cache.map(r => r.id);
    const config = await getConfig();
    const regionRanks = [RanksType.eu, RanksType.nae, RanksType.naw, RanksType.oce].find(r =>
        userRoles.includes(config.roles.find(role => role.name === r)?.id || '')
    );
    // console.log(userRoles, RanksType.nae);
    if (!regionRanks || regionRanks.length === 0) {
        const regionChannel = config.channels.find(c => c.name === ChannelsType.region);
        return interaction.reply({
            content: `You need to select a region first in <#${regionChannel?.id}>`,
            ephemeral: true,
        });
    }

    if (player.banEnd > Date.now()) {
        interaction.reply({
            content: `You are banned from queue for ${ceil(
                (player.banEnd - Date.now()) / 1000 / 60
            )} minutes`,
            ephemeral: true,
        });
        return;
    }

    await ready({ player, time: time, region: regionRanks, queueRegion: region, gameType });

    updateStatus(client);

    const content = `You have been set to be ready for a match for ${time} minutes.`;

    console.log('Responding to ready message');
    await interaction.reply({
        ephemeral: true,
        content,
    });

    const channelsType = gameTypeQueueChannels[gameType];
    const queueChannelId = await getConfig().then(
        config => config.channels.find(c => c.name === channelsType)?.id
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
        {
            name: 'region',
            description: 'NA | EU | FILL',
            type: ApplicationCommandOptionType.String,
        },
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const config = await getConfig();
        await interaction.reply({
            ephemeral: true,
            content: 'Command disabled, use ready up buttons',
        });
        return;
        // const TESTING_CHANNEL = '1063592233779073105';
        // if (
        //     interaction.channelId !== TESTING_CHANNEL &&
        //     interaction.channelId !==
        //         config.channels.filter((c: any) => c.name === ChannelsType['ranked-queue'])[0].id
        // ) {
        //     await interaction.reply({
        //         ephemeral: true,
        //         content: 'Keep queue commands in queue',
        //     });
        //     return;
        // }
        // const option = interaction.options.get('time');
        // const isNumber = typeof option?.value == 'number';
        // const readyTime = isNumber ? (option.value as number) : 30;
        // const region = interaction.options.get('region');
        // if (region && !['na', 'eu', 'fill'].includes((region.value as string)?.toLowerCase())) {
        //     return interaction.reply({
        //         content: 'Region must be NA, EU, or FILL',
        //     });
        // }

        // handleReady({
        //     interaction,
        //     time: readyTime,
        //     client,
        //     region: ((region?.value as string)?.toLowerCase() as RegionsType) || 'fill',
        // });

        //If all players are in queue, send a "stratingw within the next minute message" maybe even seconds (in x seconds)
    },
};
