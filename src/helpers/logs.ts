import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema';
import { botLog } from './messages';
import { getTeam } from './players';

export const logMatch = async ({ match, client }: { match: IMatch; client: Client }) => {
    // const embed = createMatchEmbed({ matchNumber: match.match_number });
    const teamArating = getTeam(match.players, 'a').reduce((acc, p) => acc + p.rating, 0);
    const teamBrating = getTeam(match.players, 'b').reduce((acc, p) => acc + p.rating, 0);
    botLog({ messageContent: 'Teams for match ' + match.match_number, client });
    botLog({
        messageContent:
            'Team A: ' +
            getTeam(match.players, 'a').map(p => `<@${p.id}>`) +
            ` - ${teamArating} Average: ${teamArating / getTeam(match.players, 'a').length}`,
        client,
    });
    botLog({
        messageContent:
            'Team B: ' +
            getTeam(match.players, 'b').map(p => `<@${p.id}>`) +
            ` - ${teamBrating} Average: ${teamBrating / getTeam(match.players, 'b').length}`,
        client,
    });
    // botLog({ messageContent: { embeds: [embed] }, client });
};
