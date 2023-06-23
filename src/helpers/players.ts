import { shuffle } from 'lodash';
import { IQueue } from '../models/queue.schema';
import { IMatchPlayer } from '../models/match.schema.js';
import { IPlayer } from '../models/player.schema.js';

export interface ICreateTeamsResponse {
    teamA: string[];
    teamB: string[];
}

export const splitObjects = (players: IQueue[]) => {
    const sortedObjects = players.slice().sort((a, b) => b.rating - a.rating);
    const group1 = [];
    const group2 = [];

    for (const obj of sortedObjects) {
        if (
            group1.reduce((sum, o) => sum + o.rating, 0) <=
            group2.reduce((sum, o) => sum + o.rating, 0)
        ) {
            group1.push(obj);
        } else {
            group2.push(obj);
        }
    }

    return [group1, group2];
};

export const createTeams = (queuePlayers: IQueue[]): IMatchPlayer[] => {
    const players = shuffle(queuePlayers);
    const fairTeams = splitObjects(players);
    const teamA: IMatchPlayer[] = fairTeams[0].map((q, i) => ({
        id: q.discordId,
        team: 'a',
        name: q.name,
        rating: q.rating,
        region: q.region,
        queueTime: q.signup_time,
        ...(i === 0 ? { captain: true } : {}),
    }));
    const teamB: IMatchPlayer[] = fairTeams[1].map((q, i) => ({
        id: q.discordId,
        team: 'b',
        name: q.name,
        rating: q.rating,
        region: q.region,
        queueTime: q.signup_time,
        ...(i === 0 ? { captain: true } : {}),
    }));

    return [...teamA, ...teamB];
};

export const getTeam = (players: IMatchPlayer[], team: 'a' | 'b'): IMatchPlayer[] => {
    return players.filter(p => p.team === team);
};
