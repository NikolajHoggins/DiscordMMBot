import { ButtonInteraction, Client } from 'discord.js';
import { handleUnready } from '../../commands/Unready.js';
import { handleReady } from '../../commands/Ready.js';

export const handleReadyInteraction = async (interaction: ButtonInteraction, client: Client) => {
    const action = interaction.customId.split('.')[1];

    if (action === 'unready') {
        return await handleUnready(client, interaction);
    }

    const time = parseInt(action);

    handleReady({ client, interaction, time });
};
