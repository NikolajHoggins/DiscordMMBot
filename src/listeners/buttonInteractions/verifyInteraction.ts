import { ButtonInteraction, Client } from 'discord.js';
import Match, { IMatch } from '../../models/match.schema.js';

export const handleVerifyInteraction = ({
    interaction,
    match,
}: {
    interaction: ButtonInteraction;
    match: IMatch;
}) => {
    return new Promise(async resolve => {
        interaction.reply({ content: 'Verified', ephemeral: true });
        await setPlayerVerified({ matchNumber: match.match_number, playerId: interaction.user.id });
        resolve(true);
    });
};

const setPlayerVerified = async ({
    playerId,
    matchNumber,
}: {
    playerId: string;
    matchNumber: number;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');

        const result = await Match.updateOne(
            { 'players.id': playerId, version: match.version },
            { $set: { 'players.$.verifiedScore': true }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            console.log('Verify score conflict, retrying');
            setTimeout(() => {
                setPlayerVerified({ playerId, matchNumber });
            }, 1000);
            return;
        }

        resolve(true);
    });
};
