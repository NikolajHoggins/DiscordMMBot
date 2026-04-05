export const ButtonInteractionsType = {
    verify: 'verify',
} as const;

export type ButtonInteractionsType =
    typeof ButtonInteractionsType[keyof typeof ButtonInteractionsType];
