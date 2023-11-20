import { Client } from 'discord.js';
import cron from 'node-cron';
import Player from '../models/player.schema';

export const runBanTickDown = async (client: Client) => {
    if (!client.user) return;

    const now = Date.now();

    const HOURS_24 = 24 * 60 * 60 * 1000;
    const DAYS_3 = HOURS_24 * 3;

    //Get all users with a ban multiplier
    const players = await Player.find({
        banMultiplier: { $gt: 0 },
        banTickDown: { $lt: now + DAYS_3 },
    });

    for (const i in players) {
        const player = players[i];

        //Tick down ban multiplier
        const newBanMultiplier = player.banMultiplier - 1;
        await Player.updateOne(
            { discordId: player.discordId },
            { banMultiplier: newBanMultiplier, banTickDown: now }
        );
    }
};

const initBanTickDownCron = async (client: Client) => {
    cron.schedule('*/1 * * * *', async () => {
        runBanTickDown(client);
    });
};
export default initBanTickDownCron;
