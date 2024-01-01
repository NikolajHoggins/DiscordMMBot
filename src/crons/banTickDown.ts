import { Client } from 'discord.js';
import cron from 'node-cron';
import Player from '../models/player.schema';
import { botLog } from '../helpers/messages';

export const runBanTickDown = async (client: Client) => {
    if (!client.user) return;

    const now = Date.now();

    const HOURS_24 = 24 * 60 * 60 * 1000;
    const DAYS_2 = HOURS_24 * 2;
    const DAYS_3 = HOURS_24 * 3;

    //Get all users with a ban multiplier
    const players = await Player.find({
        banMultiplier: { $gt: 0 },
        banTickDown: { $lt: now - DAYS_3 },
    });

    for (const i in players) {
        const player = players[i];
        botLog({
            client,
            messageContent: `Tick down ban for <@${player.discordId}> from ${
                player.banMultiplier
            } to ${player.banMultiplier - 1}`,
        });

        //Cowboy fix for having first ban tickdown happen after 3 days and then all following be after 24 hours
        const NEXT_BAN_TICK_DOWN = now - DAYS_2;
        //Tick down ban multiplier
        const newBanMultiplier = player.banMultiplier - 1;
        await Player.updateOne(
            { discordId: player.discordId },
            { banMultiplier: newBanMultiplier, banTickDown: NEXT_BAN_TICK_DOWN }
        );
    }
};

const initBanTickDownCron = async (client: Client) => {
    cron.schedule('*/1 * * * *', async () => {
        runBanTickDown(client);
    });
};
export default initBanTickDownCron;
