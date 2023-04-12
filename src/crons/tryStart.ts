import { Client } from 'discord.js';
import cron from 'node-cron';
import { tryStart } from '../services/match.service.js';

const initTryStartCron = async (client: Client) => {
    cron.schedule('* * * * *', async () => {
        tryStart(client);
    });
};
export default initTryStartCron;
