import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import Queue from '../models/queue.schema';
import { groupBy, map, upperCase } from 'lodash';

export const QueueCommand: Command = {
    name: 'queue',
    description: 'Get list of players looking for a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const queuePlayers = await Queue.find();

        const naPlayers = queuePlayers.filter(q => q.queueRegion === 'na');
        const euPlayers = queuePlayers.filter(q => q.queueRegion === 'eu');
        const fillPlayers = queuePlayers.filter(q => q.queueRegion === 'fill');
        const requeuePlayers = queuePlayers.filter(q => q.region === 'requeue');

        const euString = euPlayers.map(p => p.name).join(', ');
        const naString = naPlayers.map(p => p.name).join(', ');
        const fillString = fillPlayers.map(p => p.name).join(', ');
        const requeueString = requeuePlayers.map(p => p.name).join(', ');
        // const regionString = map(regions, (value, key) => {
        //     return `${value.length} - ${upperCase(key)}`;
        // }).join(', ');

        let content = `Currently looking for a game: ${queuePlayers.length}`;
        // queuePlayersPlayers.forEach(queue => {
        //     content = `${content} ${queue.name},`;
        // });
        content = `${content}\n**Requeue** - [${requeuePlayers.length}] - ${requeueString}`;
        content = `${content}\n**Fill** - [${fillPlayers.length}] - ${fillString}`;
        content = `${content}\n**EU** -[${euPlayers.length}] - ${euString}`;
        content = `${content}\n**NA** -[${naPlayers.length}] - ${naString}`;

        await interaction.reply({
            content,
        });
    },
};
