import { Client } from 'discord.js';
import cron from 'node-cron';
import Player from '../models/player.schema';

export const runBanTickDown = async (client: Client) => {
    if (!client.user) return;
    console.log('Start ban tick down');

    const now = Date.now();
    const HOURS_24 = 24 * 60 * 60 * 1000;
    //Get all users with a ban multiplier
    const players = await Player.find({
        banMultiplier: { $gt: 0 },
        banTickDown: { $gt: now + HOURS_24 },
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
    cron.schedule('*/30 * * * *', async () => {
        runBanTickDown(client);
    });
};
export default initBanTickDownCron;
