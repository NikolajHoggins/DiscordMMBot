export const BansType = {
    mod: 'mod',
    abandon: 'abandon',
    preAbandon: 'preAbandon',
    ready: 'ready',
} as const;

export type BansType = typeof BansType[keyof typeof BansType];

export const banTimes: Record<keyof typeof BansType, number> = {
    [BansType.mod]: 10,
    [BansType.abandon]: 45,
    [BansType.preAbandon]: 15,
    [BansType.ready]: 20,
};
