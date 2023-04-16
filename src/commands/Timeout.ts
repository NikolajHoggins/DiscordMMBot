import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import Player from '../models/player.schema.js';
import Queue from '../models/queue.schema.js';
import { getGuild } from '../helpers/guild.js';
import { BansType } from '../types/bans.js';

export const Timeout: Command = {
    name: 'timeout',
    description: 'Get player stats?',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to timeout',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Number,
            name: 'duration',
            description: 'timeout in minutes',
            min_value: 1,
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'reason',
            description: 'timeout in minutes',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const reason = interaction.options.get('reason')?.value;
        const durationValue = interaction.options.get('duration')?.value as number;
        if (!durationValue) return interaction.reply({ content: 'provide timeout time' });

        if (!mention) return interaction.reply({ content: 'no mention' });
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }

        await playerService.addBan({
            userId: mention.id,
            reason: reason as string,
            duration: durationValue,
            modId: user.id,
            type: BansType.mod,
            client,
        });

        interaction.reply({
            content: `Done`,
        });
    },
};
