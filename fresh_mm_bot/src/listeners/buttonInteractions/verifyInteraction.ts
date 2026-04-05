import { ButtonInteraction, Client } from 'discord.js';
import Match, { IMatch } from '../../models/match.schema';
import { GameType } from '../../types/queue';
import { botLog } from '../../helpers/messages';
import { safelyReplyToInteraction } from '../../helpers/interactions';

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

        botLog({
            messageContent: `User ${interaction.user.username} verified score on match ${matchNumber}`,
            client: interaction.client,
        });
        if (match.status === 'ended') return;
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
        const totalNeeded = match.gameType === GameType.squads ? match.players.length / 2 + 1 : 2;

        safelyReplyToInteraction({
            interaction,
            content: `Verified (${verifiedPlayersCount} / ${totalNeeded})`,
            ephemeral: true,
        });

        const messages = await interaction.channel?.messages.fetch();

        if (!messages)
            return safelyReplyToInteraction({
                interaction,
                content: 'No messages found, try again later',
                ephemeral: true,
            });

        for (const message of messages) {
            if (message[1].author.id === interaction.client.user?.id) {
                if (message[1].content.includes('Missing verify')) {
                    setTimeout(async () => {
                        const newMatch = await Match.findOne({ match_number: match.match_number });
                        if (!newMatch) throw new Error('Match not found');
                        const missingPlayers = newMatch.players.filter(p => !p.ready);
                        await message[1].edit(
                            missingPlayers.length === 0
                                ? 'Everyone has confirmed, match ending soon'
                                : 'Missing players: ' +
                                      missingPlayers.map(p => `<@${p.id}>`).join(' ')
                        );
                    }, 2000);
                }
            }
        }
        resolve(true);
    });
};
