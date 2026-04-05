export const EmoteTypes = {
    w: 'w',
    l: 'l',
    d: 'd',
} as const;

export type EmoteTypes = keyof typeof EmoteTypes;

export type EmotesType = Record<EmoteTypes, string>;
