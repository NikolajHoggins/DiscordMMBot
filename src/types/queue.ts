export const RegionsType = {
    eu: 'eu',
    na: 'na',
    fill: 'fill',
} as const;

export type RegionsType = keyof typeof RegionsType;
