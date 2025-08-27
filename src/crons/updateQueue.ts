import { ActivityType, Client } from 'discord.js';
import cron from 'node-cron';
import Queue, { IQueue } from '../models/queue.schema';
import * as queueService from '../services/queue.service';
import { getChannelId } from '../services/system.service';
import { VCType } from '../types/channel';
import Match from '../models/match.schema';
import { getGuild } from '../helpers/guild';
import { botLog, sendDirectMessage } from '../helpers/messages';

export const updateStatus = async (client: Client) => {
    if (!client.user) return;
    console.log('Start updateStatus');

    const now = Date.now();
    const expired = await Queue.find({ expires: { $lt: now } });
    for (const i in expired) {
        const user = await client.users?.fetch(expired[i].discordId);

        await sendDirectMessage({ client, userId: user.id, message: 'Your queue has expired' });
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
        console.log('found players in playing channel');
        const matches = await Match.find({ status: 'started' });
        const playersInMatches = matches.map(m => m.players).flat();
        playersInPlayingChannel.setName(`Players playing: ${playersInMatches.length}`);
    }

    const matchesPlayedChannelId = await getChannelId(VCType['matches-played']);
    console.log('matchesPlayedChannelId', matchesPlayedChannelId);
    const matchesPlayedChannel = await guild.channels.fetch(matchesPlayedChannelId);
    if (matchesPlayedChannel) {
        console.log('found matches played channel');
        const matches = await Match.find();
        matchesPlayedChannel.setName(`Matches played: ${matches.length}`);
    }
    // const playersQueueChannelId = await getChannelId(VCType['players-queue']);
    // const playersInQueueChannel = await guild.channels.fetch(playersQueueChannelId);
    // if (playersInQueueChannel) {
    //     console.log('found players in queue channel');
    //     playersInQueueChannel.setName(`Players in queue: ${queue.length}`);
    // }

    console.log('End updateStatus');
};

const initStatusCron = async (client: Client) => {
    cron.schedule('* * * * *', async () => {
        updateStatus(client);
    });
};
export default initStatusCron;
