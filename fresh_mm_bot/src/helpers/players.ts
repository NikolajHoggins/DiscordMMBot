import { shuffle } from 'lodash';
import { IQueue } from '../models/queue.schema';
import { IMatchPlayer } from '../models/match.schema.js';
import { IPlayer } from '../models/player.schema.js';

export interface ICreateTeamsResponse {
    teamA: string[];
    teamB: string[];
}

export const splitTeams = (players: IQueue[]) => {
    const sortedPlayers = players.sort((a, b) => b.rating - a.rating);
    const group1 = [];
    const group2 = [];

    for (const player of sortedPlayers) {
        if (
            group1.reduce((sum, o) => sum + o.rating, 0) <=
            group2.reduce((sum, o) => sum + o.rating, 0)
        ) {
            group1.push(player);
        } else {
            group2.push(player);
        }
    }

    return [group1, group2];
};

export const createTeams = (queuePlayers: IQueue[]): IMatchPlayer[] => {
    const players = shuffle(queuePlayers);
    const fairTeams = splitTeams(players);
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

export const getClosestNumbers = (numbers: number[], target: number) => {
    // sort numbers by their absolute difference from the target
    numbers.sort((a: number, b: number) => Math.abs(target - a) - Math.abs(target - b));

    // return the first 10 numbers
    return numbers.slice(0, 10);
};
