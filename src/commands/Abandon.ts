import { CommandInteraction, Client, ApplicationCommandType, User } from 'discord.js';
import { Command } from '../Command';
import { end, findByChannelId } from '../services/match.service';
import Player from '../models/player.schema';
import { sendMessageInChannel } from '../helpers/messages';
import { addBan } from '../services/player.service';
import { BansType } from '../types/bans';
import Match from '../models/match.schema';
import { safelyReplyToInteraction } from '../helpers/interactions';

export const handleAbandon = async ({
    client,
    interaction,
    channelId,
    user,
}: {
    client: Client;
    channelId: string;
    user: User;
    interaction: CommandInteraction;
}) => {
    const match = await findByChannelId(channelId);
    if (!match) {
        return safelyReplyToInteraction({
            interaction,
            content: 'Command only works in match thread',
            ephemeral: true,
        });
    }
    if (match.status === 'pending') {
        safelyReplyToInteraction({
            interaction,
            content: `<@${user.id}> has denied the match. Match has been cancelled. Player has been given a timeout from queueing.`,
            ephemeral: false,
        });
        const player = await Player.findOne({ discordId: user.id });
        if (!player)
            return safelyReplyToInteraction({
                interaction,
                content: `User not found`,
                ephemeral: true,
            });

        const reason = `Denied match ${match.match_number} before it started`;

        addBan({
            userId: user.id,
            reason,
            client,
            type: BansType.preAbandon,
            display: true,
        });

        setTimeout(() => {
            end({ matchNumber: match.match_number, client });
        }, 3000);
        return;
    }

    // set flag on match, will be used in elo calculation
    await Match.updateOne(
        {
            match_number: match.match_number,
            'players.id': interaction.user.id,
            version: match.version,
        },
        { $set: { 'players.$.abandon': true }, $inc: { version: 1 } }
    );

    //set a timeout on player, and add a timeout history
    const player = await Player.findOne({ discordId: user.id });
    if (!player)
        return safelyReplyToInteraction({
            interaction,
            content: `User not found`,
            ephemeral: true,
        });

    const reason = `Abandoned match ${match.match_number}`;

    addBan({
        userId: user.id,
        reason,
        client,
        type: BansType.abandon,
        display: true,
    });

    //add a loss to player history
    const ABANDON_ELO_CHANGE = -10;
    await Player.updateOne(
        { discordId: user.id },
        {
            $inc: { rating: ABANDON_ELO_CHANGE },
            $push: {
                ratingHistory: {
                    rating: player.rating + ABANDON_ELO_CHANGE,
                    date: new Date(),
                    reason: `Abandon match ${match.match_number}`,
                },
                history: {
                    matchNumber: match.match_number,
                    result: 'abandon',
                    change: ABANDON_ELO_CHANGE,
                },
            },
        }
    );

    await sendMessageInChannel({
        channelId: channelId,
        messageContent: `<@&${match.roleId}> <@${user.id}> has abandoned the match. They are not allowed to join the game again, and has been given a timeout from playing. \nYou will keep playing with the remaining players. \nSince one team is at a disadvantage, the team with a missing player will lose less elo for a loss, and win more from a win.`,
        client,
    });

    await safelyReplyToInteraction({
        interaction,
        ephemeral: true,
        content:
            'You have abandoned the match. You are not allowed to join the game again, and have been timed out.',
    });
};

export const Abandon: Command = {
    name: 'abandon',
    description: 'If you absolutely have to leave the game, use this command to abandon it.',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;

        handleAbandon({ client, interaction, user, channelId });
    },
};
