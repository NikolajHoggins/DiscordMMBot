import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { getConfig } from '../services/system.service';
import Match, { MatchStatus } from '../models/match.schema';

export const VoteMVP: Command = {
    name: 'vote_mvp',
    description: 'Vote for a player to be MVP',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.Mentionable,
            name: 'user',
            description: 'User to vote as MVP',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const config = await getConfig();
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'no mention' });

        //find active match with user
        const match = await Match.findOne({ 'players.id': user.id, status: MatchStatus.started });

        if (!match) {
            interaction.reply({ content: 'You are not in an active match', ephemeral: true });
            return;
        }

        if (!match.players.find(p => p.id === mention?.id)) {
            interaction.reply({ content: 'User is not in your match', ephemeral: true });
            return;
        }

        const ownTeam = match.players.find(p => p.id === user.id)?.team;
        if (!ownTeam) {
            interaction.reply({ content: 'You are not in a team', ephemeral: true });
            return;
        }

        const otherTeam = match.players.find(p => p.id === mention?.id)?.team;

        if (ownTeam !== otherTeam) {
            interaction.reply({ content: 'User is not in your team', ephemeral: true });
            return;
        }

        // const response = await canPing();
        // if (response === true) {
        // await sendMessage({
        //     channelId: interaction.channelId,
        //     messageContent: 'content',
        //     client,
        // });
        interaction.reply({ content: `Voted <@${mention.id}> as mvp`, ephemeral: true });

        // await setPingCooldown();
        return;
        // }

        // interaction.reply('Cannot ping for another ' + response + 'minutes');
    },
};
