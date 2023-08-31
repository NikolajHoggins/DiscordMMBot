import { getGameTeams } from '../services/system.service';

export const getTeamBName = async (teamAName: string): Promise<string> => {
    const gameTeams = await getGameTeams();
    return gameTeams.filter(t => t !== teamAName)[0];
};
