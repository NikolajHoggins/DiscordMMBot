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
import { getGuild } from '../../helpers/guild';
import { BansType } from '../../types/bans';
import { getConfig } from '../../services/system.service';
import { RanksType } from '../../types/channel';
import { botLog } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';

export const Timeout: Command = {
    name: 'timeout',
    description: 'Stop a player from queueing for given time',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
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
        {
            type: ApplicationCommandOptionType.Boolean,
            name: 'display',
            description:
                'Send message in ranked queue channel, defaults to not sending message about ban',
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const reason = interaction.options.get('reason')?.value;
        const display = interaction.options.get('display')?.value;
        const durationValue = interaction.options.get('duration')?.value as number;
        if (!durationValue) return interaction.reply({ content: 'provide timeout time' });

        if (!mention) return interaction.reply({ content: 'no mention' });

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        await playerService.addBan({
            userId: mention.id,
            reason: reason as string,
            duration: durationValue,
            modId: user.id,
            type: BansType.mod,
            client,
            display: display as boolean,
        });

        botLog({
            messageContent: `<@${user.id}> timed out <@${mention.id}> for reason ${reason}`,
            client,
        });

        interaction.reply({
            content: `Done`,
            ephemeral: true,
        });
    },
};
