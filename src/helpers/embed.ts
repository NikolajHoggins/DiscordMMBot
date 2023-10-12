import { APIEmbedField, EmbedBuilder, RestOrArray } from 'discord.js';
import Match, { IMatch } from '../models/match.schema';
import { getTeam } from './players';
import { getTeamBName } from './team';
import { capitalize } from 'lodash';
import { getGameMaps, getGameTeams, getRegionQueue, getWinScore } from '../services/system.service';
import { getMatchWinner } from './match';

export const createMatchEmbed = async ({
    matchNumber,
}: {
    matchNumber: number;
}): Promise<EmbedBuilder> => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });

        if (!match) throw new Error('Match not found');

        const teamA = getTeam(match.players, 'a');
        const teamB = getTeam(match.players, 'b');

        const teamNames = await getGameTeams();

        const teamBSide = teamNames.filter(t => t !== match.teamASide)[0];

        const gameMaps = await getGameMaps(match.gameType);

        const mapImage = gameMaps.filter(m => m.name === match.map)[0].image;

        resolve(
            new EmbedBuilder()
                .setTitle('Teams')
                .setColor('#C69B6D')
                .setImage(mapImage)
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
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');

        const teamA = getTeam(match.players, 'a');
        const teamB = getTeam(match.players, 'b');

        const teamNames = await getGameTeams();
        const winScore = await getWinScore();

        const teamBSide = teamNames.filter(t => t !== match.teamASide)[0];
        const isDraw = match.teamARounds === match.teamBRounds;

        const winner = await getMatchWinner(match);

        const gameMaps = await getGameMaps(match.gameType);

        const mapImage = gameMaps.filter(m => m.name === match.map)[0].image;

        const description = isDraw
            ? 'Match ended in a draw'
            : `${winner} won! Score was ${match.teamARounds} - ${match.teamBRounds}`;
        resolve(
            new EmbedBuilder()
                .setTitle(`Match ${matchNumber} ${capitalize(match.map)}`)
                .setColor('#C69B6D')
                .setImage(mapImage)
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

export const createScoreCardEmbed = async ({ match }: { match: IMatch }): Promise<EmbedBuilder> =>
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
                name: capitalize(await getTeamBName(match.teamASide)),
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

export const createMatchLogEmbed = async ({
    matchNumber,
}: {
    matchNumber: number;
}): Promise<EmbedBuilder> => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');

        const teamA = getTeam(match.players, 'a');
        const teamB = getTeam(match.players, 'b');

        const teamNames = await getGameTeams();
        const winScore = await getWinScore();

        const teamBSide = teamNames.filter(t => t !== match.teamASide)[0];
        const isDraw = match.teamARounds === match.teamBRounds;

        const gameMaps = await getGameMaps(match.gameType);

        const mapImage = gameMaps.filter(m => m.name === match.map)[0].image;

        // const description = isDraw
        //     ? 'Match ended in a draw'
        //     : `${winner} won! Score was ${match.teamARounds} - ${match.teamBRounds}`;

        const teamArating = getTeam(match.players, 'a').reduce((acc, p) => acc + p.rating, 0);
        const teamBrating = getTeam(match.players, 'b').reduce((acc, p) => acc + p.rating, 0);

        const teamAString = `${teamArating} Average: ${
            teamArating / getTeam(match.players, 'a').length
        }`;
        const teamBString = `${teamBrating} Average: ${
            teamBrating / getTeam(match.players, 'b').length
        }`;
        const description = `Teams for match ${matchNumber}`;
        resolve(
            new EmbedBuilder()
                .setTitle(`Match ${matchNumber} ${capitalize(match.map)}`)
                .setColor('#C69B6D')
                .setImage(mapImage)
                .setDescription(description)
                .addFields(
                    {
                        name: `Team A - ${capitalize(match.teamASide)} - [${match.teamARounds}]`,
                        value: `${teamAString}\n${
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
                        value: `${teamBString}\n${
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
