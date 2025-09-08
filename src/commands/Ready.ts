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
        messageContent: `${player.name} readied up!`,
        client,
    });
};
