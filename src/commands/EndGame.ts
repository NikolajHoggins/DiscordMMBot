import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { getGuild } from '../helpers/guild';
import { botLog } from '../helpers/messages';

import * as matchService from '../services/match.service';
import Match from '../models/match.schema.js';

export const EndGame: Command = {
    name: 'end_game',
    description: 'Force end game lobby',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'match_number',
            description: 'Match number',
            type: ApplicationCommandOptionType.Integer,
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;

        if (!process.env.MOD_ROLE_ID || !process.env.SERVER_ID) return;
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);
        const matchNumber = interaction.options.get('match_number')?.value as number;

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
        const match = matchNumber
            ? await Match.findOne({ match_number: matchNumber })
            : await matchService.findByChannelId(channelId);

        const content = match ? 'Deleting' : 'Not in match thread';

        botLog({ messageContent: `<@${user.id}> Ended match ${match?.match_number}`, client });
        await interaction.reply({
            ephemeral: true,
            content,
        });
        if (!match) return;
        await matchService.end({ matchNumber: match.match_number, client });
    },
};
