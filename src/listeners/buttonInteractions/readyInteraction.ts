import { ButtonInteraction, Client } from 'discord.js';
import { handleUnready } from '../../commands/Unready';
import { handleReady } from '../../commands/Ready';
import { GameType, RegionsType } from '../../types/queue';
import Match from '../../models/match.schema';
import { getDuelsEnabled } from '../../services/system.service';
import { safelyReplyToInteraction } from '../../helpers/interactions';

export const handleReadyInteraction = async (interaction: ButtonInteraction, client: Client) => {
    console.log('ready interaction', interaction.customId);
    const action = interaction.customId.split('.')[1];
    const region = interaction.customId.split('.')[2] as RegionsType;
    const gameType = interaction.customId.split('.')[3] as GameType;

    if (gameType === GameType.duels) {
        const duelsEnabled = await getDuelsEnabled();
        if (!duelsEnabled) {
            safelyReplyToInteraction({
                interaction,
                content: `Duels is currently disabled`,
                ephemeral: true,
            });
            return;
        }
    }

    const { user } = interaction;

    const time = parseInt(action);

    //Check if match with player on it is in progress
    const match = await Match.find({ status: { $ne: 'ended' } }).findOne({
        'players.id': user.id,
    });

    if (match) {
        if (action === 'unready') {
            await setPlayerRequeue({
                interaction,
                matchNumber: match.match_number,
                reQueue: false,
            });
            safelyReplyToInteraction({
                interaction,
                content: `You will no longer auto requeue`,
                ephemeral: true,
            });
            return;
        }
        await setPlayerRequeue({
            interaction,
            matchNumber: match.match_number,
            reQueue: true,
        });
        safelyReplyToInteraction({
            interaction,
            content: `If your current match doesn't get accepted, you will be added to queue in fill for 5 minutes. Unqueue now if you don't want to be automatically added to queue.`,
            ephemeral: true,
        });
        return;
    }

    if (action === 'unready') {
        return await handleUnready(client, interaction);
    }

    handleReady({
        client,
        interaction,
        time,
        region: region.toLocaleLowerCase() as RegionsType,
        gameType,
    });
};

export const setPlayerRequeue = async ({
    interaction,
    matchNumber,
    reQueue,
}: {
    interaction: ButtonInteraction;
    matchNumber: number;
    reQueue: boolean;
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
            { $set: { 'players.$.reQueue': reQueue }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            console.log('requeue conflict, retrying', result);
            setTimeout(() => {
                setPlayerRequeue({
                    interaction,
                    matchNumber,
                    reQueue,
                });
            }, 1000);
            return;
        }

        resolve(true);
    });
};
