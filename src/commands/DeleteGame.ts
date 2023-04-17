import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';

import { getGuild } from '../helpers/guild';
import { botLog } from '../helpers/messages';

import Match from '../models/match.schema.js';

export const DeleteGame: Command = {
    name: '_delete_game',
    description: 'Delete a game COMPLETELY from the database',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'match_number',
            description: 'Match number',
            type: ApplicationCommandOptionType.Integer,
            required: true,
        },
        {
            name: 'confirm',
            description: 'Confirm deletion',
            type: ApplicationCommandOptionType.Boolean,
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;

        const matchNumber = interaction.options.get('match_number')?.value as number;
        if (!process.env.MOD_ROLE_ID || !process.env.SERVER_ID) return;
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        //Fetch everyone for it to be in cache
        await guild?.roles.fetch(process.env.SERVER_ID);

        if (!member) return;

        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }
        //find match with channelId
        const match = await Match.findOne({ match_number: matchNumber });

        if (!match) {
            return await interaction.reply({
                ephemeral: true,
                content: "Match doesn't exist",
            });
        }
        await Match.deleteOne({ match_number: matchNumber });

        botLog({ messageContent: `<@${user.id}> Deleted match ${match?.match_number}`, client });
        await interaction.reply({
            ephemeral: true,
            content: 'deleted',
        });
    },
};
