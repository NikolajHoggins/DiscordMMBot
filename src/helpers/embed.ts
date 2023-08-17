import { APIEmbedField, EmbedBuilder, RestOrArray } from 'discord.js';
import Match, { IMatch } from '../models/match.schema';
import { getTeam } from './players';
import { getTeamBName } from './team';
import { capitalize } from 'lodash';

// factory,skyscraper,hideout,ship
const mapImages = {
    skyscraper:
        'https://usercontent.one/wp/www.breachersvr.com/wp-content/uploads/2023/04/Thumb_Skyscraper.png?media=1678957731',
    hideout:
        'https://usercontent.one/wp/www.breachersvr.com/wp-content/uploads/2023/04/Thumb_Hideout.png?media=1678957731',
    factory:
        'https://usercontent.one/wp/www.breachersvr.com/wp-content/uploads/2023/04/Thumb_Factory.png?media=1678957731',
    ship: 'https://usercontent.one/wp/www.breachersvr.com/wp-content/uploads/2023/08/Thumb_Ship.png?media=1678957731',
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
                    mapImages[match.map as keyof typeof mapImages] ||
                        'https://usercontent.one/wp/www.breachersvr.com/wp-content/uploads/2023/04/Thumb_Factory.png?media=1678957731'
                )
                .setDescription(
                    `Map: ${capitalize(
                        match.map
                    )}\nWhen done, captains should submit how many rounds their team won\n/submit_score <rounds won>`
                )
                .addFields(
                    {
                        name: `Team A - ${capitalize(match.teamASide)}`,
                        value: `${
                            teamA.length > 0
                                ? teamA
                                      .map(p => `<@${p.id}>${p.captain ? ' - Captain' : ''}\n`)
                                      .join('')
                                : 'player'
                        }`,
                        inline: true,
                    },
                    {
                        name: `Team B - ${capitalize(teamBSide)}`,
                        value: `${
                            teamB.length > 0
                                ? teamB
                                      .map(p => `<@${p.id}>${p.captain ? ' - Captain' : ''}\n`)
                                      .join('')
                                : 'player'
                        }`,
                        inline: true,
                    }
                )
        );
    });
};

export const createMatchResultEmbed = async ({
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
        const isDraw = match.teamARounds === match.teamBRounds;

        const winner = match.teamARounds === 7 ? 'Team A' : 'Team B';

        const description = isDraw
            ? 'Match ended in a draw'
            : `${winner} won! Score was ${match.teamARounds} - ${match.teamBRounds}`;
        resolve(
            new EmbedBuilder()
                .setTitle(`Match ${matchNumber} ${capitalize(match.map)}`)
                .setColor('#C69B6D')
                .setImage(
                    mapImages[match.map as keyof typeof mapImages] ||
                        'https://usercontent.one/wp/www.breachersvr.com/wp-content/uploads/2023/04/Thumb_Factory.png?media=1678957731'
                )
                .setDescription(description)
                .addFields(
                    {
                        name: `Team A - ${capitalize(match.teamASide)} - [${match.teamARounds}]`,
                        value: `${
                            teamA.length > 0
                                ? teamA
                                      .map(p => `<@${p.id}>${p.captain ? ' - Captain' : ''}\n`)
                                      .join('')
                                : 'player'
                        }`,
                        inline: true,
                    },
                    {
                        name: `Team B - ${capitalize(teamBSide)} - [${match.teamBRounds}]`,
                        value: `${
                            teamB.length > 0
                                ? teamB
                                      .map(p => `<@${p.id}>${p.captain ? ' - Captain' : ''}\n`)
                                      .join('')
                                : 'player'
                        }`,
                        inline: true,
                    }
                )
        );
    });
};

export const createScoreCardEmbed = ({ match }: { match: IMatch }): EmbedBuilder =>
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
        );

export const createMatchListEmbed = async ({
    matches,
}: {
    matches: IMatch[];
}): Promise<EmbedBuilder> => {
    const fields: RestOrArray<APIEmbedField> = [];
    matches.forEach(match => {
        fields.push({
            name: `Match ${match.match_number}`,
            value: `Started <t:${Math.floor(match.start / 1000)}:t>\nEnding: <t:${
                Math.floor(match.start / 1000) + 2700
            }:R>`,
            inline: true,
        });
        fields.push({
            name: 'Team A',
            value: `${match.players
                .filter(p => p.team === 'a')
                .map(p => `${p.name}`)
                .join('\n')}`,
            inline: true,
        });
        fields.push({
            name: 'Team B',
            value: `${match.players
                .filter(p => p.team === 'b')
                .map(p => `${p.name}`)
                .join('\n')}`,
            inline: true,
        });
    });
    return new EmbedBuilder().setTitle('Running matches').setColor('#C69B6D').addFields(fields);
};
