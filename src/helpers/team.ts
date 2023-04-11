const getTeamBName = (teamAName: string): string => {
    if (!process.env.GAME_TEAMS) return 'team b';
    return process.env.GAME_TEAMS.split(',').filter(t => t !== teamAName)[0];
};
