import { ButtonInteraction, Client } from 'discord.js';
import Match, { IMatch } from '../../models/match.schema';

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
            console.log('Verify score conflict, retrying', result);
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

        const messages = await interaction.channel?.messages.fetch();

        if (!messages) throw new Error('No messages found');

        for (const message of messages) {
            if (message[1].author.id === interaction.client.user?.id) {
                if (message[1].content.includes('Missing verify')) {
                    setTimeout(async () => {
                        const newMatch = await Match.findOne({ match_number: match.match_number });
                        if (!newMatch) throw new Error('Match not found');
                        await message[1].edit(
                            'Missing players: ' +
                                newMatch.players
                                    .filter(p => !p.verifiedScore)
                                    .map(p => `<@${p.id}>`)
                                    .join(' ')
                        );
                    }, 2000);
                }
            }
        }
        resolve(true);
    });
};
