import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { sendMessage } from '../helpers/messages';
import { canPing, getChannelId, getConfig, setPingCooldown } from '../services/system.service';
import { ChannelsType, RanksType } from '../types/channel';

export const PingMods: Command = {
    name: 'mods',
    description: 'Ping the mods if you need help',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: 'reason',
            description: 'Reason for pinging mods',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const config = await getConfig();
        const { user } = interaction;

        const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;
        const reason = interaction.options.get('reason')?.value;
        if (typeof reason !== 'string') return;

        const content = `<@${user.id}>: ${reason.replace(/@/g, '')} <@&${modRoleId}>`;

        // const response = await canPing();
        // if (response === true) {
        await sendMessage({
            channelId: interaction.channelId,
            messageContent: content,
            client,
        });
        interaction.reply({ content: 'Pinged mods', ephemeral: true });

        // await setPingCooldown();
        return;
        // }

        // interaction.reply('Cannot ping for another ' + response + 'minutes');
    },
};
