import { Client, CommandInteraction } from 'discord.js';
import { getConfig } from '../services/system.service';
import { RanksType } from '../types/channel';
import { getGuild } from './guild';

export async function isUserMod(client: Client, interaction: CommandInteraction) {
    const guild = await getGuild(client);
    const { user } = interaction;
    const member = await guild?.members.fetch(user.id);

    const config = await getConfig();
    const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;
    if (!modRoleId) throw new Error('Mod role not found');
    const isMod = await member.roles.cache.some(r => r.id === modRoleId);
    if (!isMod) {
        await interaction.reply({
            ephemeral: true,
            content: 'no perms',
        });
        return false;
    }

    return true;
}
