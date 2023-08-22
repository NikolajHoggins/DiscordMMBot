import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import Player from '../models/player.schema.js';
import { getGuild } from '../helpers/guild.js';
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';
import { botLog } from '../helpers/messages.js';

export const GiveElo: Command = {
    name: 'give_elo',
    description: 'Give elo to a player',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to give Elo',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Number,
            name: 'elo',
            description: 'Elo to give',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const elo = interaction.options.get('elo')?.value;

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
                $inc: { rating: elo },
            }
        );

        botLog({
            messageContent: `<@${user.id}> gave <@${mention.id}> ${elo} elo`,
            client,
        });

        interaction.reply({
            content: `Done`,
            ephemeral: true,
        });
    },
};
