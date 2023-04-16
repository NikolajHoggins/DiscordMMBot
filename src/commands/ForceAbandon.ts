import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { end, findByChannelId } from '../services/match.service.js';
import Player from '../models/player.schema.js';
import { sendMessage } from '../helpers/messages.js';
import { addBan } from '../services/player.service.js';
import { BansType } from '../types/bans.js';
import { getGuild } from '../helpers/guild.js';

export const ForceAbandon: Command = {
    name: 'force_abandon',
    description: 'If you absolutely have to leave the game, use this command to abandon it.',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to abandon',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'No user mentioned', ephemeral: true });

        if (!process.env.MOD_ROLE_ID || !process.env.SERVER_ID) return;
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        if (!member) return;

        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }

        //check if in match channel
        const match = await findByChannelId(channelId);
        if (!match) {
            return interaction.reply({
                content: 'Command only works in match thread',
            });
        }
        if (match.status === 'pending') {
            await interaction.reply({
                content: `<@${mention.id}> has denied the match. Match has been cancelled. Player has been given a timeout from queueing.`,
            });
            const player = await Player.findOne({ discordId: mention.id });
            if (!player) return interaction.reply({ content: `User not found`, ephemeral: true });

            const reason = `Denied match ${match.match_number} before it started`;

            addBan({
                userId: user.id,
                reason,
                client,
                type: BansType.preAbandon,
            });

            setTimeout(() => {
                end({ matchNumber: match.match_number, client });
            }, 3000);
            return;
        }

        //remove player from match

        //add a loss to player history

        //set some sort of flag to indicate player has abandoned and from which team. This will be used in elo calculation

        //set a timeout on player, and add a timeout history
        const player = await Player.findOne({ discordId: mention.id });
        if (!player) return interaction.reply({ content: `User not found` });

        const reason = `Abandoned match ${match.match_number}`;

        addBan({
            userId: mention.id,
            reason,
            client,
            type: BansType.abandon,
        });

        await sendMessage({
            channelId: channelId,
            messageContent: `<@&${match.roleId}> <@${mention.id}> has abandoned the match. They are not allowed to join the game again, and has been given a timeout from playing. \nYou will keep playing with the remaining players. \nSince one team is at a disadvantage, the team with a missing player will lose less elo for a loss, and win more from a win (WIP, dm hoggins).>`,
            client,
        });

        await interaction.reply({
            ephemeral: true,
            content:
                'You have abandoned the match. You are not allowed to join the game again, and have been timed out.',
        });
    },
};
