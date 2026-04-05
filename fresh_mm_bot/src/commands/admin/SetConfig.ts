import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
    ApplicationCommandOptionType,
} from 'discord.js';

import { Command } from '../../Command';
import System, { ISystem } from '../../models/system.schema';
import { getConfig } from '../../services/system.service';

export const SetConfig: Command = {
    name: 'setconfig',
    description: 'set config',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: 'key',
            description: 'Key of config to set',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: 'value',
            description: 'True or false',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const key = interaction.options.get('key')?.value;
        const value = interaction.options.get('value')?.value;

        if (typeof key !== 'string' || typeof value !== 'boolean')
            return interaction.reply({
                content: 'Type invalid',
                ephemeral: true,
            });

        const HOGGINS_DISCORD_ID = '241759050155425803';
        if (user.id !== HOGGINS_DISCORD_ID)
            return interaction.reply({
                content: 'You are not authorized to use this command',
                ephemeral: true,
            });

        //Check if key exists on Isystem type
        const config = await getConfig();
        if (!(key in config))
            return interaction.reply({
                content: 'Key does not exist',
                ephemeral: true,
            });

        //Check if value is valid
        const valueIsValid = typeof config[key as keyof ISystem] === typeof value;
        if (!valueIsValid)
            return interaction.reply({
                content: 'Value is not valid',
                ephemeral: true,
            });

        //Update config
        await System.updateOne({ _id: config._id }, { [key]: value });

        await interaction.reply({ content: 'done', ephemeral: true });
    },
};
