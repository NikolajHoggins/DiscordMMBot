export type Game = 'vail' | 'breachers' | 'x8';

const dbNameToGame: Record<string, Game> = {
    vail: 'vail',
    bot: 'breachers',
    x8: 'x8',
};

export const getGame = (): Game => {
    return dbNameToGame[process.env.DB_NAME || ''] || 'vail';
};
