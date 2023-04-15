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

        const regions = groupBy(queuePlayers.map(p => p.region));

        const regionString = map(regions, (value, key) => {
            return `${value.length} - ${upperCase(key)}`;
        }).join(', ');

        let content = 'Currently looking for a game: ';
        queuePlayers.forEach(queue => {
            content = `${content} ${queue.name},`;
        });
        content = `[${queuePlayers.length}] - ${content}  ${regionString}`;

        await interaction.reply({
            content,
        });
    },
};
