import { CommandInteraction, Client, Interaction, ButtonInteraction } from 'discord.js';
import { Commands } from '../Commands';
import { findByChannelId } from '../services/match.service.js';
import { getTeam } from '../helpers/players.js';
import Match, { IMatch } from '../models/match.schema.js';

export default (client: Client): void => {
    client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isCommand()) {
            await handleSlashCommand(client, interaction);
        }
        if (interaction.isButton()) {
            await handleButtonInteraction(client, interaction);
        }
    });
};

const handleButtonInteraction = async (client: Client, interaction: ButtonInteraction) =>
    //check if in pending match channel
    {
        const match = await findByChannelId(interaction.channelId);
        if (!match || match.status !== 'pending') {
            interaction.reply({ content: 'Not in pending match channel' });
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
        interaction.reply({ content: `You cannot vote here` });
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

        interaction.reply({ content: `You voted ${interaction.customId}` });

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
        console.log('found match', match.version);

        const result = await Match.updateOne(
            { 'players.id': playerId, version: match.version },
            { $set: { 'players.$.vote': vote }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            console.log('Vote conflict, retrying');
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
        interaction.followUp({ content: 'An error has occurred' });
        return;
    }

    await interaction.deferReply();

    slashCommand.run(client, interaction);
};
