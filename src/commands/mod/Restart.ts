import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { getGuild } from '../../helpers/guild';
import { getConfig } from '../../services/system.service';
import { RanksType } from '../../types/channel';
import { isUserMod } from '../../helpers/permissions';

export const RestartBot: Command = {
    name: 'restart_bot',
    description: 'Restart the bot, only for mods',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user } = interaction;

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        if (!member) return;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        throw new Error('Restarting bot');
    },
};
