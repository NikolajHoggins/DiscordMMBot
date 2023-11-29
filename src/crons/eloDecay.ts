import { Client } from 'discord.js';
import cron from 'node-cron';
import Player, { IPlayer } from '../models/player.schema';
import { sendMessage } from '../helpers/messages';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';

export const runEloDecay = async (client: Client) => {
    console.log('Running elo decay cron');
    if (!client.user) return;

    const now = Date.now();

    const HOURS_24 = 24 * 60 * 60 * 1000;
    const DAYS_10 = HOURS_24 * 10;

    //Get all users afk for more than 10 days
    const players = await Player.find({
        lastMatch: { $lt: now - DAYS_10 },
    });

    console.log(`removing elo from ${players.length} players`);
    for (const i in players) {
        const player: IPlayer = players[i];

        if (!player.lastMatch) continue;

        const daysSinceLastMatch = Math.round((now - player.lastMatch) / HOURS_24);

        // Calculate elo loss as 5 + 0.1 for every day over 10
        const daysOverTen = Math.max(0, daysSinceLastMatch - 10);
        const eloChange = -1 * (5 + 0.1 * daysOverTen);

        // Tick down elo
        await Player.updateOne(
            { discordId: player.discordId },
            {
                $inc: { rating: eloChange },
                $push: {
                    ratingHistory: {
                        rating: player.rating + eloChange,
                        date: Date.now(),
                        reason: `${daysSinceLastMatch} days since last match`,
                    },
                },
            }
        );

        //get queue channel id
        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
        sendMessage({
            channelId: queueChannelId,
            messageContent: `<@${player.discordId}> lost ${
                eloChange * -1
            } elo for being inactive for ${daysSinceLastMatch} days`,
            client,
        });
    }
};

const initEloDecayCron = async (client: Client) => {
    cron.schedule('0 0 * * *', async () => {
        runEloDecay(client);
    });
};
export default initEloDecayCron;
