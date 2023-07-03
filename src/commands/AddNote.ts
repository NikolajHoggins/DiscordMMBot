import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getGuild } from '../helpers/guild.js';
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';

export const AddNote: Command = {
    name: 'addnote',
    description: 'Set a mod note on a player',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to put note on',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'note',
            description: 'Note to add',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const note = interaction.options.get('note')?.value;

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

        await playerService.addNote({
            userId: mention.id,
            note: note as string,
            modId: user.id,
        });

        interaction.reply({
            content: `Added note to ${mention.username}`,
        });
    },
};
