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
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';

export const Untimeout: Command = {
    name: 'untimeout',
    description: 'Remove timeout from player',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to remove timeout from',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'no mention' });
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

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

        await Player.updateOne(
            { discordId: mention.id },
            {
                $set: { banEnd: 0 },
            }
        );

        interaction.reply({
            content: `Done`,
        });
    },
};
