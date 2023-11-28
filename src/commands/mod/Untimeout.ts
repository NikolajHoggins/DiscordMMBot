import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import Player from '../../models/player.schema';
import { botLog } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';

export const Untimeout: Command = {
    name: 'untimeout',
    description: 'Remove timeout from player',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
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

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        await Player.updateOne(
            { discordId: mention.id },
            {
                $set: { banEnd: 0 },
            }
        );

        botLog({
            messageContent: `<@${user.id}> untimouted <@${mention.id}>`,
            client,
        });

        interaction.reply({
            content: `Done`,
            ephemeral: true,
        });
    },
};
