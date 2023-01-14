import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import Queue from '../models/queue.schema';

export const QueueCommand: Command = {
    name: 'queue',
    description: 'Get list of players looking for a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const queuePlayers = await Queue.find();

        let content = 'Currently looking for a game: ';
        queuePlayers.forEach(queue => {
            content = `${content} ${queue.name},`;
        });

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
