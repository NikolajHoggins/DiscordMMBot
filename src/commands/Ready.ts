import { ButtonInteraction, Client, CommandInteraction } from 'discord.js';
import { ceil } from 'lodash';
import { updateStatus } from '../crons/updateQueue';
import { safelyReplyToInteraction } from '../helpers/interactions';
import { sendMessageInChannel } from '../helpers/messages';
import * as playerService from '../services/player.service';
import { ready } from '../services/queue.service';
import { getConfig } from '../services/system.service';
import { ChannelsType, RanksType } from '../types/channel';
import { GameType, RegionsType, gameTypeQueueChannels } from '../types/queue';
import { getGame } from '../helpers/game';

type WeightedMessage = { message: (name: string) => string; weight: number };

const readyMessages: Record<string, WeightedMessage[]> = {
    vail: [
        { message: (name) => `${name} readied up!`, weight: 90 },
        { message: (name) => `${name} picked up his mk!`, weight: 2 },
        { message: (name) => `${name} took out the scanner!`, weight: 2 },
        { message: (name) => `${name} is ready to win elo!`, weight: 2 },
        { message: (name) => `${name} is ready to lose!`, weight: 2 },
        { message: (name) => `${name} joined queue.. maybe dodge this one`, weight: 2 },
    ],
    breachers: [
        { message: (name) => `${name} readied up!`, weight: 90 },
        { message: (name) => `${name} is ready!`, weight: 2 },
        { message: (name) => `${name} joined the queue!`, weight: 2 },
        { message: (name) => `${name} is looking for a game!`, weight: 2 },
        { message: (name) => `${name} wants to play!`, weight: 2 },
        { message: (name) => `${name} hopped in the queue!`, weight: 2 },
    ],
    x8: [
        { message: (name) => `${name} readied up!`, weight: 90 },
        { message: (name) => `${name} is ready!`, weight: 2 },
        { message: (name) => `${name} joined the queue!`, weight: 2 },
        { message: (name) => `${name} is looking for a game!`, weight: 2 },
        { message: (name) => `${name} wants to play!`, weight: 2 },
        { message: (name) => `${name} hopped in the queue!`, weight: 2 },
    ],
};

const getReadyMessage = (name: string) => {
    const game = getGame();
    const messages = readyMessages[game];
    const totalWeight = messages.reduce((sum, m) => sum + m.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const m of messages) {
        roll -= m.weight;
        if (roll <= 0) return m.message(name);
    }
    return messages[0].message(name);
};

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
        return safelyReplyToInteraction({
            interaction,
            content: `You need to select a region first in <#${regionChannel?.id}>`,
            ephemeral: true,
        });
    }

    if (player.banEnd > Date.now()) {
        safelyReplyToInteraction({
            interaction,
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

    await safelyReplyToInteraction({ interaction, content, ephemeral: true });

    const channelsType = gameTypeQueueChannels[gameType];
    const queueChannelId = await getConfig().then(
        config => config.channels.find(c => c.name === channelsType)?.id
    );
    if (!queueChannelId) throw new Error('Queue channel not found');
    await sendMessageInChannel({
        channelId: queueChannelId,
        messageContent: getReadyMessage(player.name),
        client,
    });
};
