export const ButtonInteractionsType = {
    verify: 'verify',
};

export type ButtonInteractionsType =
    typeof ButtonInteractionsType[keyof typeof ButtonInteractionsType];
