import {
    CommandInteraction,
    Client,
    Interaction,
    ButtonInteraction,
    StringSelectMenuInteraction,
} from 'discord.js';
import { Commands } from '../Commands';
import { findByChannelId } from '../services/match.service';
import Match, { IMatch, MatchStatus } from '../models/match.schema';
import { ButtonInteractionsType } from '../types/interactions';
import { handleVerifyInteraction } from './buttonInteractions/verifyInteraction';
import { handleReadyInteraction } from './buttonInteractions/readyInteraction';
import { handleRegionInteraction } from './buttonInteractions/regionInteraction';
import { handleMatchInteraction } from './buttonInteractions/handleMatchInteraction';
import { respondWithQueue } from '../commands/Queue';
import { GameType } from '../types/queue';
import { setPlayerMvpVote } from '../commands/VoteMVP';
import { botLog } from '../helpers/messages';
import { safelyReplyToInteraction } from '../helpers/interactions';

export default (client: Client): void => {
    client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isCommand()) {
            await handleSlashCommand(client, interaction);
            return;
        }
        if (interaction.isButton()) {
            await handleButtonInteraction(client, interaction);
        }
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(client, interaction);
        }
    });
};

const handleSelectMenuInteraction = async (
    client: Client,
    interaction: StringSelectMenuInteraction
) => {
    const channelId = interaction.channelId;
    const match = await findByChannelId(channelId);
    if (!match) {
        safelyReplyToInteraction({ interaction, content: 'Not in match channel', ephemeral: true });
        return;
    }
    //Check if discord user is in match
    const players = match.players.map(p => p.id);
    if (!players.includes(interaction.user.id)) {
        safelyReplyToInteraction({
            interaction,
            content: 'You are not a player in this match',
            ephemeral: true,
        });
        return;
    }

    const votedPlayerId = interaction.values[0];

    // Check if voted player is on same team as the player voting
    const votedPlayer = match.players.find(p => p.id === votedPlayerId);
    const votingPlayer = match.players.find(p => p.id === interaction.user.id);
    if (!votedPlayer || !votingPlayer) {
        safelyReplyToInteraction({ interaction, content: 'Player not found', ephemeral: true });
        return;
    }

    if (votedPlayer.team !== votingPlayer.team) {
        safelyReplyToInteraction({
            interaction,
            content: 'You can only vote for players on your team',
            ephemeral: true,
        });
        return;
    }

    // Don't allow voting for yourself
    if (votedPlayer.id === votingPlayer.id) {
        safelyReplyToInteraction({
            interaction,
            content: 'You cannot vote for yourself',
            ephemeral: true,
        });
        return;
    }

    botLog({
        messageContent: `<@${interaction.user.id}> voted <@${votedPlayerId}> as MVP`,
        client,
    });

    setPlayerMvpVote({
        playerId: interaction.user.id,
        matchNumber: match.match_number,
        client,
        mvpVoteId: votedPlayerId,
    });

    safelyReplyToInteraction({
        interaction,
        content: `Voted <@${votedPlayerId}> as mvp`,
        ephemeral: true,
    });
};

const handleButtonInteraction = async (client: Client, interaction: ButtonInteraction) => {
    const match = await findByChannelId(interaction.channelId);

    if (interaction.customId.split('.')[0] === 'seeQueue') {
        const gameType = interaction.customId.split('.')[1] as GameType;
        return respondWithQueue(interaction, true, gameType);
    }

    if (interaction.customId.split('.')[0] === 'ready') {
        return handleReadyInteraction(interaction, client);
    }

    if (interaction.customId.split('.')[0] === 'region') {
        return handleRegionInteraction(interaction, client);
    }

    if (interaction.customId.split('.')[0] === 'match') {
        return handleMatchInteraction(interaction, client);
    }

    if (!match) {
        safelyReplyToInteraction({ interaction, content: 'Not in match channel', ephemeral: true });
        return;
    }

    if (interaction.customId === ButtonInteractionsType.verify) {
        await handleVerifyInteraction({ interaction, match });
        return;
    }

    if (!match || match.status !== MatchStatus.voting) {
        safelyReplyToInteraction({
            interaction,
            content: 'Not in pending match channel',
            ephemeral: true,
        });
        return;
    }

    const players = match.players.map(p => p.id);

    if (
        players.includes(interaction.user.id) &&
        [match.channels.teamA, match.channels.teamB].includes(interaction.channelId)
    ) {
        await handleMatchVote({ client, match, interaction });
        return;
    }

    //Check if on correct team
    safelyReplyToInteraction({ interaction, content: `You cannot vote here`, ephemeral: true });
};

const handleMatchVote = async ({
    client,
    interaction,
    match,
}: {
    client: Client;
    interaction: ButtonInteraction;
    match: IMatch;
}) => {
    return new Promise(async resolve => {
        const matchPlayer = match.players.find(p => p.id === interaction.user.id);
        if (!matchPlayer) throw new Error('Player not in match');

        await updatePlayerVote({
            playerId: matchPlayer.id,
            vote: interaction.customId,
            matchNumber: match.match_number,
        });

        safelyReplyToInteraction({
            interaction,
            content: `You voted ${interaction.customId}`,
            ephemeral: true,
        });

        resolve(true);
    });
};

const updatePlayerVote = async ({
    playerId,
    vote,
    matchNumber,
}: {
    playerId: string;
    vote: string;
    matchNumber: number;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');

        const result = await Match.updateOne(
            { match_number: match.match_number, 'players.id': playerId, version: match.version },
            { $set: { 'players.$.vote': vote }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            setTimeout(() => {
                updatePlayerVote({ playerId, vote, matchNumber });
            }, 1000);
            return;
        }

        resolve(true);
    });
};

const handleSlashCommand = async (
    client: Client,
    interaction: CommandInteraction
): Promise<void> => {
    const slashCommand = Commands.find(c => c.name === interaction.commandName);
    if (!slashCommand) {
        safelyReplyToInteraction({ interaction, content: 'An error has occurred' });
        return;
    }

    slashCommand.run(client, interaction);
};
