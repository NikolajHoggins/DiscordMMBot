import { ButtonInteraction, Client } from 'discord.js';
import { getConfig } from '../../services/system.service.js';
import { getGuild } from '../../helpers/guild.js';

export const handleRegionInteraction = async (interaction: ButtonInteraction, client: Client) => {
    const region = interaction.customId.split('.')[1];

    //get region from config
    const config = await getConfig();
    const regionRole = config.roles.find(r => r.name === region);
    if (!regionRole) return interaction.reply({ content: 'no role', ephemeral: true });
    const guild = await getGuild(client);
    const member = await guild.members.fetch(interaction.user.id);
    await member.roles.add(regionRole.id);
    interaction.reply({ content: `You are now ${regionRole.name}`, ephemeral: true });
};
