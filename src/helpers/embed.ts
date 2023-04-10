import { EmbedBuilder } from 'discord.js';
import { IMatch } from '../models/match.schema.js';
import { getTeam } from './players.js';

export const createMatchEmbed = ({ match }: { match: IMatch }) => {
    const teamA = getTeam(match.players, 'a');
    const teamB = getTeam(match.players, 'b');
    return new EmbedBuilder()
        .setTitle('Teams')
        .setColor('#C69B6D')
        .addFields(
            {
                name: 'Team A',
                value: `${teamA.length > 0 ? teamA.map(p => `<@${p.id}>\n`) : 'player'}`,
                inline: true,
            },
            { name: 'Team B', value: `${teamB.map(p => `<@${p.id}>\n`)}`, inline: true }
        );
};
