import { CommandInteraction, Client, ApplicationCommandType, ButtonInteraction } from 'discord.js';
import { Command } from '../Command';
import Queue from '../models/queue.schema';
import { groupBy, map, upperCase } from 'lodash';
import { getChannelId, getRegionQueue } from '../services/system.service';
import { GameType, gameTypeName, gameTypeQueueChannels } from '../types/queue';
import { botLog } from '../helpers/messages';

export const QueueCommand: Command = {
    name: 'queue',
    description: 'Get list of players looking for a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const channelId = interaction.channelId;
        const duelsChannelId = await getChannelId(gameTypeQueueChannels[GameType.duels]);
        const gameType = channelId === duelsChannelId ? GameType.duels : GameType.squads;
        respondWithQueue(interaction, false, gameType);
    },
};

export const respondWithQueue = async (
    interaction: CommandInteraction | ButtonInteraction,
    ephemeral: boolean,
    gameType: GameType
) => {
    //Fetch user from database
    const queuePlayers = await Queue.find({ gameType });
    const regionQueueEnabled = await getRegionQueue();

    let content = `Currently looking for a ${gameTypeName[gameType]} game: ${queuePlayers.length}`;
    const requeuePlayers = queuePlayers.filter(q => q.region === 'requeue');

    const requeueString = requeuePlayers.map(p => p.name).join(', ');

    content = `${content}\n**Requeue** - [${requeuePlayers.length}] - ${requeueString}`;
    if (regionQueueEnabled) {
        const naPlayers = queuePlayers.filter(q => q.queueRegion === 'na');
        const euPlayers = queuePlayers.filter(q => q.queueRegion === 'eu');
        const fillPlayers = queuePlayers.filter(q => q.queueRegion === 'fill');
        const euString = euPlayers.map(p => p.name).join(', ');
        const naString = naPlayers.map(p => p.name).join(', ');
        const fillString = fillPlayers.map(p => p.name).join(', ');
        content = `${content}\n**Fill** - [${fillPlayers.length}] - ${fillString}`;
        content = `${content}\n**EU** -[${euPlayers.length}] - ${euString}`;
        content = `${content}\n**NA** - [${naPlayers.length}] - ${naString}`;
    } else {
        const normalPlayersString = queuePlayers
            .filter(q => q.region !== 'requeue')
            .map(p => p.name)
            .join(', ');
        content = `${content}\n**Queue** -[${
            queuePlayers.filter(q => q.region !== 'requeue').length
        }] - ${normalPlayersString}`;
    }

    try {
        await interaction.reply({
            content,
            ephemeral: ephemeral,
        });
    } catch (error) {
        botLog({
            messageContent: `Error responding with queue: ${error}`,
            client: interaction.client,
        });
    }
};
