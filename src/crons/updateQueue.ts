import { ActivityType, Client } from 'discord.js';
import cron from 'node-cron';
import Queue, { IQueue } from '../models/queue.schema';
import * as queueService from '../services/queue.service';
import { getChannelId, getConfig } from '../services/system.service.js';
import { VCType } from '../types/channel.js';
import Match from '../models/match.schema.js';
import { getGuild } from '../helpers/guild.js';

export const updateStatus = async (client: Client) => {
    if (!client.user) return;

    const now = Date.now();
    const expired = await Queue.find({ expires: { $lt: now } });
    for (const i in expired) {
        const user = await client.users?.fetch(expired[i].discordId);

        await user.send('Your queue has expired');
        console.log('sent dm to user', user.username, 'queue expired');
    }
    await Queue.deleteMany({ expires: { $lt: now } });
    const queue = await queueService.get();
    await client.user.setActivity(`${queue.length} players in queue`, {
        type: ActivityType.Watching,
    });

    const guild = await getGuild(client);

    //Set stats on voice channels
    const playersPlayingChannelId = await getChannelId(VCType['players-playing']);
    const playersInPlayingChannel = await guild.channels.fetch(playersPlayingChannelId);
    if (playersInPlayingChannel) {
        //Get all players in queue and in started matches
        const matches = await Match.find({ status: 'started' });
        const playersInMatches = matches.map(m => m.players).flat();
        await playersInPlayingChannel.setName(`Players playing: ${playersInMatches.length}`);
    }

    const playersQueueChannelId = await getChannelId(VCType['players-queue']);
    const playersInQueueChannel = await guild.channels.fetch(playersQueueChannelId);
    if (playersInQueueChannel) {
        const playersInQueue = await queueService.get();
        await playersInQueueChannel.setName(`Players in queue: ${playersInQueue.length}`);
    }

    const matchesPlayedChannelId = await getChannelId(VCType['matches-played']);
    const matchesPlayedChannel = await guild.channels.fetch(matchesPlayedChannelId);
    if (matchesPlayedChannel) {
        const matches = await Match.find();
        await matchesPlayedChannel.setName(`Matches played: ${matches.length}`);
    }
};

const initStatusCron = async (client: Client) => {
    cron.schedule('* * * * *', async () => {
        updateStatus(client);
    });
};
export default initStatusCron;
