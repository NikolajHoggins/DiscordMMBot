import { CommandInteraction, Client, Interaction, ButtonInteraction } from 'discord.js';
import { Commands } from '../Commands';
import { findByChannelId } from '../services/match.service.js';
import { getTeam } from '../helpers/players.js';

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

        const teamA = getTeam(match.players, 'a').map(p => p.id);
        const teamB = getTeam(match.players, 'b').map(p => p.id);

        if (teamA.includes(interaction.user.id) && interaction.channelId === match.channels.teamA) {
            return await handleSideVote(client, interaction);
        }

        if (teamB.includes(interaction.user.id) && interaction.channelId === match.channels.teamB) {
            return await handleMapVote(client, interaction);
        }

        //Check if on correct team
        interaction.reply({ content: `You cannot vote here` });
    };

const handleMapVote = async (client: Client, interaction: ButtonInteraction) => {
    interaction.reply({ content: `You voted ${interaction.customId}` });
};
const handleSideVote = async (client: Client, interaction: ButtonInteraction) => {
    //add vote to the id send
    interaction.reply({ content: `You voted ${interaction.customId}` });
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
