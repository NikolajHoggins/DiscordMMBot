import { ButtonInteraction, Client } from 'discord.js';

export const handleVerifyInteraction = ({
    interaction,
    client,
}: {
    interaction: ButtonInteraction;
    client: Client;
}) => {
    return new Promise(resolve => {
        interaction.reply({ content: 'Verified', ephemeral: true });
        resolve(true);
    });
};
