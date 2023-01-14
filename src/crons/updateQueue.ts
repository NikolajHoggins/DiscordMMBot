import { Client } from 'discord.js';
import cron from 'node-cron';
import Queue from '../models/queue.schema';
import * as queueService from '../services/queue.service';

const updateStatus = async (client: Client) => {
    cron.schedule('* * * * *', async () => {
        console.log('Running updateStatusQueue');
        if (!client.user) return;

        const now = Date.now();

        await Queue.deleteMany({ expires: { $lt: now } });

        const queue = await queueService.get();
        await client.user.setActivity(`${queue.length} players in queue`);
    });
};
export default updateStatus;
