import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { getGuild } from '../../helpers/guild';
import { botLog } from '../../helpers/messages';

import * as matchService from '../../services/match.service';
import Match from '../../models/match.schema';
import { RanksType } from '../../types/channel';
import { getConfig } from '../../services/system.service';
import { isUserMod } from '../../helpers/permissions';

export const EndGame: Command = {
    name: 'end_game',
    description: 'Force end game lobby',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
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

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);
        const matchNumber = interaction.options.get('match_number')?.value as number;

        if (!member) return;

        console.log('before usermod check');
        if (await !isUserMod(client, interaction)) return;
        console.log('after usermod check');

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
        await matchService.end({ matchNumber: match.match_number, client, requeuePlayers: true });
    },
};
