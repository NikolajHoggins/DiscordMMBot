import { Client } from 'discord.js';
import cron from 'node-cron';
import * as queueService from '../services/queue.service';

const updateStatus = async (client: Client) => {
    cron.schedule('* * * * *', async () => {
        console.log('Running updateStatusQueue');
        if (!client.user) return;

        const queue = await queueService.get();

        await client.user.setActivity(`${queue.length} players in queue`);
    });
};
export default updateStatus;
