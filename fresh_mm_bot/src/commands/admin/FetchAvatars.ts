import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { getGuild } from '../../helpers/guild';
import { botLog } from '../../helpers/messages';

import * as matchService from '../../services/match.service';
import Match from '../../models/match.schema';
import { RanksType } from '../../types/channel';
import { getConfig } from '../../services/system.service';
import Player from '../../models/player.schema';

export const FetchAvatars: Command = {
    name: 'fetch_avatars',
    description: 'Refresh all avatars',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, guild } = interaction;

        const HOGGINS_DISCORD_ID = '241759050155425803';
        if (user.id !== HOGGINS_DISCORD_ID)
            return interaction.reply({
                content: 'You are not authorized to use this command',
                ephemeral: true,
            });

        const guildMembers = await guild?.members.fetch();

        guildMembers?.forEach(async member => {
            const avatar = member.displayAvatarURL();
            await Player.updateOne({ discordId: member.id }, { avatarUrl: avatar });
        });

        interaction.reply({ content: 'done', ephemeral: true });
    },
};
