import { ButtonInteraction, Client } from 'discord.js';
import Match, { IMatch } from '../../models/match.schema.js';
import { sendMessage } from '../../helpers/messages.js';

export const handleVerifyInteraction = ({
    interaction,
    match,
}: {
    interaction: ButtonInteraction;
    match: IMatch;
}) => {
    return new Promise(async resolve => {
        await setPlayerVerified({ matchNumber: match.match_number, interaction });
        resolve(true);
    });
};

const setPlayerVerified = async ({
    interaction,
    matchNumber,
}: {
    interaction: ButtonInteraction;
    matchNumber: number;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');

        const result = await Match.updateOne(
            {
                match_number: match.match_number,
                'players.id': interaction.user.id,
                version: match.version,
            },
            { $set: { 'players.$.verifiedScore': true }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            console.log('Verify score conflict, retrying');
            setTimeout(() => {
                setPlayerVerified({ interaction, matchNumber });
            }, 1000);
            return;
        }

        //Check if modified is larger than half the players.floor
        const verifiedPlayersCount =
            match.players.filter(p => p.verifiedScore && p.id !== interaction.user.id).length + 1;
        const totalNeeded = match.players.length / 2 + 1;

        interaction.reply({
            content: `Verified (${verifiedPlayersCount} / ${totalNeeded})`,
            ephemeral: true,
        });

        if (verifiedPlayersCount >= totalNeeded) {
            await sendMessage({
                channelId: interaction.channelId,
                messageContent: 'All players have verified score',
                client: interaction.client,
            });
        }

        resolve(true);
    });
};
