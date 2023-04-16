export const BansType = {
    mod: 'mod',
    abandon: 'abandon',
    preAbandon: 'preAbandon',
    ready: 'ready',
} as const;

export type BansType = typeof BansType[keyof typeof BansType];

export const banTimes: Record<keyof typeof BansType, number> = {
    [BansType.mod]: 10,
    [BansType.abandon]: 30,
    [BansType.preAbandon]: 5,
    [BansType.ready]: 10,
};
