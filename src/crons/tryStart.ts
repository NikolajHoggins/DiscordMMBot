import { Client } from 'discord.js';
import cron from 'node-cron';
import { checkPlayersReady, checkScoreVerified, tryStart } from '../services/match.service';
import Match from '../models/match.schema';
import { GameType } from '../types/queue';

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

const verifyPlayersReady = async (client: Client) => {
    const matches = await Match.find({ status: 'pending' });
    matches.forEach(match => {
        checkPlayersReady({ matchNumber: match.match_number, client });
    });
};

const initTryStartCron = async (client: Client) => {
    cron.schedule('* * * * *', async () => {
        tryStart(client, GameType.squads);
        tryStart(client, GameType.duels);
        verifyRunningMatches(client);
        verifyPlayersReady(client);
        //Cronjob hacker :sunglasses:
        setTimeout(() => {
            verifyRunningMatches(client);
            verifyPlayersReady(client);
            tryStart(client, GameType.squads);
            tryStart(client, GameType.duels);
        }, 30000);
    });
};
export default initTryStartCron;
