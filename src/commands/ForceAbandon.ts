import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { end, findByChannelId } from '../services/match.service.js';
import Player from '../models/player.schema.js';
import { botLog, sendMessage } from '../helpers/messages.js';
import { addBan } from '../services/player.service.js';
import { BansType } from '../types/bans.js';
import { getGuild } from '../helpers/guild.js';
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';
import { handleAbandon } from './Abandon.js';

export const ForceAbandon: Command = {
    name: 'force_abandon',
    description: 'If you absolutely have to leave the game, use this command to abandon it.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to abandon',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'No user mentioned', ephemeral: true });

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

        //check if in match channel
        handleAbandon({ interaction, user: mention, channelId, client });

        botLog({
            messageContent: `<@${user.id}> force abandonned <@${mention.id}>`,
            client,
        });
    },
};
