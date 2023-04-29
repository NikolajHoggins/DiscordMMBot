import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { getGuild } from '../helpers/guild';
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';

export const RestartBot: Command = {
    name: 'restart_bot',
    description: 'Restart the bot, only for mods',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user } = interaction;

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        if (!member) return;

        const config = await getConfig();
        const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;
        const isMod = await member.roles.cache.some(r => r.id === modRoleId);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }

        throw new Error('Restarting bot');
    },
};
