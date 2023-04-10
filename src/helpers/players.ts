import { shuffle } from 'lodash';
import { IQueue } from '../models/queue.schema';
import { IMatchPlayer } from '../models/match.schema.js';

export interface ICreateTeamsResponse {
    teamA: string[];
    teamB: string[];
}
export const createTeams = (queuePlayers: IQueue[]): ICreateTeamsResponse => {
    const players = shuffle(queuePlayers);
    const teamA = players.slice(0, players.length / 2).map(q => q.discordId);
    const teamB = players.slice(players.length / 2, players.length).map(q => q.discordId);

    return { teamA, teamB };
};

export const getTeam = (players: IMatchPlayer[], team: 'a' | 'b'): IMatchPlayer[] => {
    return players.filter(p => p.team === team);
};
