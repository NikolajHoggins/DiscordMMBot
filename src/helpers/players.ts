import { shuffle } from 'lodash';
import { IQueue } from '../models/queue.schema';
import { IMatchPlayer } from '../models/match.schema.js';

export interface ICreateTeamsResponse {
    teamA: string[];
    teamB: string[];
}
export const createTeams = (queuePlayers: IQueue[]): IMatchPlayer[] => {
    const players = shuffle(queuePlayers);
    const teamA: IMatchPlayer[] = players
        .slice(0, players.length / 2)
        .map(q => ({ id: q.discordId, team: 'a', name: q.name, rating: q.rating }));
    const teamB: IMatchPlayer[] = players
        .slice(players.length / 2, players.length)
        .map(q => ({ id: q.discordId, team: 'b', name: q.name, rating: q.rating }));

    return [...teamA, ...teamB];
};

export const getTeam = (players: IMatchPlayer[], team: 'a' | 'b'): IMatchPlayer[] => {
    return players.filter(p => p.team === team);
};
