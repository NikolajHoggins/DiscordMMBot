import { Client } from 'discord.js';
import cron from 'node-cron';
import { checkScoreVerified, tryStart } from '../services/match.service.js';
import Match from '../models/match.schema.js';

const verifyRunningMatches = async (client: Client) => {
    const matches = await Match.find({
        status: 'started',
        teamARounds: { $exists: true },
        teamBRounds: { $exists: true },
    });
    console.log('found matches', matches);
    matches.forEach(match => {
        checkScoreVerified({ matchNumber: match.match_number, client });
    });
};

const initTryStartCron = async (client: Client) => {
    cron.schedule('* * * * *', async () => {
        tryStart(client);
        verifyRunningMatches(client);
        //Cronjob hacker :sunglasses:
        setTimeout(() => {
            verifyRunningMatches(client);
            tryStart(client);
        }, 30000);
    });
};
export default initTryStartCron;
