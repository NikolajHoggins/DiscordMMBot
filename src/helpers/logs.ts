import { EmbedBuilder } from '@discordjs/builders';
import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema';
import { createMatchEmbed } from './embed';
import { botLog } from './messages';
import { getTeam } from './players.js';

export const logMatch = async ({ match, client }: { match: IMatch; client: Client }) => {
    // const embed = createMatchEmbed({ matchNumber: match.match_number });
    botLog({ messageContent: 'Teams for match ' + match.match_number, client });
    botLog({
        messageContent: 'Team A: ' + getTeam(match.players, 'a').map(p => `<@${p.id}>`),
        client,
    });
    botLog({
        messageContent: 'Team B: ' + getTeam(match.players, 'b').map(p => `<@${p.id}>`),
        client,
    });
    // botLog({ messageContent: { embeds: [embed] }, client });
};
