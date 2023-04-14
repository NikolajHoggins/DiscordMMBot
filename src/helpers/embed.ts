import { Embed, EmbedBuilder } from 'discord.js';
import Match, { IMatch } from '../models/match.schema.js';
import { getTeam } from './players.js';
import { getTeamBName } from './team.js';

export const capitalize = (team: string) => {
    return team.charAt(0).toUpperCase() + team.slice(1);
};

export const createMatchEmbed = async ({
    matchNumber,
}: {
    matchNumber: number;
}): Promise<EmbedBuilder> => {
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
                .setImage(
                    `https://usercontent.one/wp/www.breachersvr.com/wp-content/uploads/2023/04/Thumb_${capitalize(
                        match.map
                    )}.png?media=1678957731`
                )
                .setDescription(
                    `Map: ${capitalize(
                        match.map
                    )}\When done, captains should submit how many rounds their team won\n/submit_score <rounds won>`
                )
                .addFields(
                    {
                        name: capitalize(match.teamASide),
                        value: `${
                            teamA.length > 0
                                ? teamA.map(p => `<@${p.id}>${p.captain ? ' - Captain' : ''}\n`)
                                : 'player'
                        }`,
                        inline: true,
                    },
                    {
                        name: capitalize(teamBSide),
                        value: `${
                            teamB.length > 0
                                ? teamB.map(p => `<@${p.id}>${p.captain ? 'Captain' : ''}\n`)
                                : 'player'
                        }`,
                        inline: true,
                    }
                )
        );
    });
};

export const createScoreCardEmbed = async ({ match }: { match: IMatch }): Promise<EmbedBuilder> => {
    return new Promise(async resolve => {
        resolve(
            new EmbedBuilder()
                .setTitle('Scores')
                .setColor('#C69B6D')
                .setDescription('Verify the scores below by hitting "Verify"')
                .addFields(
                    {
                        name: capitalize(match.teamASide),
                        value: `${match.teamARounds}`,
                        inline: true,
                    },
                    {
                        name: capitalize(getTeamBName(match.teamASide)),
                        value: `${match.teamBRounds}`,
                        inline: true,
                    }
                )
        );
    });
};
