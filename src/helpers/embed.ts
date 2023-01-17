import { EmbedBuilder } from 'discord.js';

export const createTeamsEmbed = ({ teamA, teamB }: { teamA: string[]; teamB: string[] }) => {
    return new EmbedBuilder()
        .setTitle('Teams')
        .setColor('#C69B6D')
        .addFields(
            {
                name: 'Team A',
                value: `${teamA.length > 0 ? teamA.map(p => `<@${p}>\n`) : 'player'}`,
                inline: true,
            },
            { name: 'Team B', value: `${teamB.map(p => `<@${p}>\n`)}`, inline: true }
        );
};
