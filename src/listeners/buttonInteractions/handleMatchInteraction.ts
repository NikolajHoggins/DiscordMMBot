import { ButtonInteraction, Client } from 'discord.js';

import Match from '../../models/match.schema.js';
import { findByChannelId } from '../../services/match.service.js';

export const handleMatchInteraction = async (interaction: ButtonInteraction, client: Client) => {
    const action = interaction.customId.split('.')[1];
    if (action === 'confirm') {
        const match = await findByChannelId(interaction.channelId);
        if (!match) return interaction.reply({ content: 'Not in match channel', ephemeral: true });

        await setPlayerReady({
            playerId: interaction.user.id,
            matchNumber: match.match_number,
            client,
        });

        const messages = await interaction.channel?.messages.fetch();

        if (!messages) throw new Error('No messages found');

        for (const message of messages) {
            if (message[1].author.id === client.user?.id) {
                if (message[1].content.includes('Missing players')) {
                    setTimeout(async () => {
                        const newMatch = await Match.findOne({ match_number: match.match_number });
                        if (!newMatch) throw new Error('Match not found');
                        await message[1].edit(
                            'Missing players: ' +
                                newMatch.players
                                    .filter(p => !p.ready)
                                    .map(p => `<@${p.id}>`)
                                    .join(' ')
                        );
                    }, 2000);
                }
            }
        }

        try {
            interaction.reply({
                content: 'You are ready, game will take around 30 seconds to start',
                ephemeral: true,
            });
        } catch (error) {
            console.log(error);
        }
    }
};

export const setPlayerReady = ({
    playerId,
    matchNumber,
    client,
}: {
    playerId: string;
    matchNumber: number;
    client: Client;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });

        if (!match) throw new Error('Match not found');

        const result = await Match.updateOne(
            {
                match_number: match.match_number,
                'players.id': playerId,
                version: match.version,
            },
            { $set: { 'players.$.ready': true }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            console.log('Player ready conflict, retrying');
            setTimeout(() => {
                setPlayerReady({ playerId, matchNumber, client });
            }, 1000);
            return;
        }

        resolve(true);
    });
};
