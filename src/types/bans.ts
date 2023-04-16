export const BansType = {
    mod: 'mod',
    abandon: 'abandon',
    ready: 'ready',
};

export type BansType = typeof BansType[keyof typeof BansType];
