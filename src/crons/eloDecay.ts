import { Client } from 'discord.js';
import cron from 'node-cron';
import Player, { IPlayer } from '../models/player.schema';
import { botLog } from '../helpers/messages';

export const runEloDecay = async (client: Client) => {
    console.log('Running elo decay cron');
    if (!client.user) return;

    const now = Date.now();

    const HOURS_24 = 24 * 60 * 60 * 1000;
    const DAYS_10 = HOURS_24 * 10;

    //Get all users with a ban multiplier
    const players = await Player.find({
        lastMatch: { $lt: now + DAYS_10 },
    });

    console.log(`removing elo from ${players.length} players`);
    for (const i in players) {
        const player: IPlayer = players[i];

        if (!player.lastMatch) continue;

        const daysSinceLastMatch = (now - player.lastMatch) / HOURS_24;

        const eloChange = daysSinceLastMatch * -1;

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

        const user = await client.users?.fetch(player.discordId);

        try {
            await user.send(
                `You lost ${eloChange * -1} elo for being inactive for ${daysSinceLastMatch} days`
            );
        } catch (error) {
            botLog({
                messageContent: `Failed to send decay message to <@${user.id}>`,
                client,
            });
        }
    }
};

const initEloDecayCron = async (client: Client) => {
    cron.schedule('0 0 * * *', async () => {
        runEloDecay(client);
    });
};
export default initEloDecayCron;
