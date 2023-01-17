import { IPlayer } from '../models/player.schema.js';
import { IQueue } from '../models/queue.schema';

export interface ICreateTeamsResponse {
    teamA: IQueue[];
    teamB: IQueue[];
}
export const createTeams = (queuePlayers: IQueue[]): Promise<ICreateTeamsResponse> => {
    return new Promise(() => {});
};
