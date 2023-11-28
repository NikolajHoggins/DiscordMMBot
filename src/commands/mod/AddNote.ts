import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import * as playerService from '../../services/player.service';
import { botLog } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';

export const AddNote: Command = {
    name: 'addnote',
    description: 'Set a mod note on a player',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
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

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        await playerService.addNote({
            userId: mention.id,
            note: note as string,
            modId: user.id,
        });

        botLog({
            messageContent: `<@${user.id}> added mod note to <@${mention.id}> \n ${note}`,
            client,
        });

        interaction.reply({
            content: `Added note to ${mention.username}`,
            ephemeral: true,
        });
    },
};
