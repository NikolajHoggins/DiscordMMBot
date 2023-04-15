import { ButtonInteraction, Client } from 'discord.js';
import { handleUnready } from '../../commands/Unready.js';
import { handleReady } from '../../commands/Ready.js';
import { RegionsType } from '../../types/queue.js';

export const handleReadyInteraction = async (interaction: ButtonInteraction, client: Client) => {
    const action = interaction.customId.split('.')[1];
    const region = interaction.customId.split('.')[2] as RegionsType;

    if (action === 'unready') {
        return await handleUnready(client, interaction);
    }

    const time = parseInt(action);

    handleReady({ client, interaction, time, region: region.toLocaleLowerCase() as RegionsType });
};
