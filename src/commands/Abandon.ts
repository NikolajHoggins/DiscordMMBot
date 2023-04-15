import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { end, findByChannelId } from '../services/match.service.js';
import Player from '../models/player.schema.js';
import { getChannelId } from '../services/system.service.js';
import { ChannelsType } from '../types/channel.js';
import { sendMessage } from '../helpers/messages.js';

export const Abandon: Command = {
    name: 'abandon',
    description: 'If you absolutely have to leave the game, use this command to abandon it.',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;

        //check if in match channel
        const match = await findByChannelId(channelId);
        if (!match) {
            return interaction.reply({
                content: 'Command only works in match thread',
            });
        }
        if (match.status === 'pending') {
            await interaction.reply({
                content: `<@${user.id}> has denied the match. Match has been cancelled. Player has been given a timeout from queueing.`,
            });
            const player = await Player.findOne({ discordId: user.id });
            if (!player) return interaction.reply({ content: `User not found` });
            const previousBans = player.bans.filter(b => !b.modId).length;
            const now = new Date();
            const reason = `Denied match ${match.match_number} before it started`;
            const durationValue = 10 * (previousBans + 1);
            const timeoutEnd = now.getTime() + durationValue * 60 * 1000;
            const banBody = {
                startTime: now,
                reason: reason,
                timeoutInMinutes: durationValue,
            };

            await Player.updateOne(
                { discordId: user.id },
                {
                    $set: { banStart: now, banEnd: timeoutEnd, test: 'lol' },
                    ...(player.bans
                        ? {
                              $push: {
                                  bans: banBody,
                              },
                          }
                        : { $set: { bans: [banBody] } }),
                }
            );
            const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
            await sendMessage({
                channelId: queueChannelId,
                messageContent: `<@${user.id}> has been timed out for ${durationValue} minutes due to "${reason}"`,
                client,
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
        const player = await Player.findOne({ discordId: user.id });
        if (!player) return interaction.reply({ content: `User not found` });
        const previousBans = player.bans.filter(b => !b.modId).length;
        const now = new Date();
        const reason = `Abandoned match ${match.match_number}`;
        const durationValue = 30 * (previousBans + 1);
        const timeoutEnd = now.getTime() + durationValue * 60 * 1000;
        const banBody = {
            startTime: now,
            reason: reason,
            timeoutInMinutes: durationValue,
        };

        await Player.updateOne(
            { discordId: user.id },
            {
                $set: { banStart: now, banEnd: timeoutEnd, test: 'lol' },
                ...(player.bans
                    ? {
                          $push: {
                              bans: banBody,
                          },
                      }
                    : { $set: { bans: [banBody] } }),
            }
        );

        await sendMessage({
            channelId: channelId,
            messageContent: `<@&${match.roleId}> <@${user.id}> has abandoned the match. They are not allowed to join the game again, and has been given a timeout from playing. \nYou will keep playing with the remaining players. \nSince one team is at a disadvantage, the team with a missing player will lose less elo for a loss, and win more from a win (WIP, dm hoggins).>`,
            client,
        });

        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
        await sendMessage({
            channelId: queueChannelId,
            messageContent: `<@${user.id}> has been timed out for ${durationValue} minutes due to "${reason}"`,
            client,
        });

        await interaction.reply({
            ephemeral: true,
            content:
                'You have abandoned the match. You are not allowed to join the game again, and have been timed out.',
        });
    },
};
