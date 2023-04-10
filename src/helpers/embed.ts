import { EmbedBuilder } from 'discord.js';
import Match, { IMatch } from '../models/match.schema.js';
import { getTeam } from './players.js';

const prettyTeamName = (team: string) => {
    console.log('team name', team);
    return team.charAt(0).toUpperCase() + team.slice(1);
};

export const createMatchEmbed = async ({ matchNumber }: { matchNumber: number }) => {
    return new Promise(async resolve => {
        if (!process.env.GAME_TEAMS) throw new Error('GAME_TEAMS not set');
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');

        const teamA = getTeam(match.players, 'a');
        const teamB = getTeam(match.players, 'b');

        const teamBSide = process.env.GAME_TEAMS.split(',').filter(t => t !== match.teamASide)[0];
        resolve(
            new EmbedBuilder()
                .setTitle('Teams')
                .setColor('#C69B6D')
                .setImage('https://upload.wikimedia.org/wikipedia/en/3/3e/Csgo_dust2.jpg')
                .setDescription(`Map: ${prettyTeamName(match.map)}`)
                .addFields(
                    {
                        name: prettyTeamName(match.teamASide),
                        value: `${teamA.length > 0 ? teamA.map(p => `<@${p.id}>\n`) : 'player'}`,
                        inline: true,
                    },
                    {
                        name: prettyTeamName(teamBSide),
                        value: `${teamB.map(p => `<@${p.id}>\n`)}`,
                        inline: true,
                    }
                )
        );
    });
};
