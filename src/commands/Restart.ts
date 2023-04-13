import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { getGuild } from '../helpers/guild';

export const RestartBot: Command = {
    name: 'restart_bot',
    description: 'Restart the bot, only for mods',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;

        if (!process.env.MOD_ROLE_ID || !process.env.SERVER_ID) return;
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        //Fetch everyone for it to be in cache
        await guild?.roles.fetch(process.env.SERVER_ID);

        if (!member) return;

        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }
        //find match with channelId
        throw new Error('Restarting bot');
    },
};
