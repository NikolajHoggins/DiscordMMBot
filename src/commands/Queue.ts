import { CommandInteraction, Client, ApplicationCommandType, ButtonInteraction } from 'discord.js';
import { Command } from '../Command';
import Queue from '../models/queue.schema';
import { groupBy, map, upperCase } from 'lodash';
import { getRegionQueue } from '../services/system.service';

export const QueueCommand: Command = {
    name: 'queue',
    description: 'Get list of players looking for a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        respondWithQueue(interaction, false);
    },
};

export const respondWithQueue = async (
    interaction: CommandInteraction | ButtonInteraction,
    ephemeral: boolean
) => {
    //Fetch user from database
    const queuePlayers = await Queue.find();
    const regionQueueEnabled = await getRegionQueue();

    let content = `Currently looking for a game: ${queuePlayers.length}`;
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

    await interaction.reply({
        content,
        ephemeral: ephemeral,
    });
};
