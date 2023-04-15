import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { ceil, floor } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getRankName } from '../helpers/rank.js';
import Player from '../models/player.schema.js';
import Queue from '../models/queue.schema.js';
import { getGuild } from '../helpers/guild.js';

export const Timeout: Command = {
    name: 'timeout',
    description: 'Get player stats?',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to timeout',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Number,
            name: 'duration',
            description: 'timeout in minutes',
            min_value: 1,
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'reason',
            description: 'timeout in minutes',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const reason = interaction.options.get('reason')?.value;
        const durationValue = interaction.options.get('duration')?.value as number;
        if (!durationValue) return interaction.reply({ content: 'provide timeout time' });

        if (!mention) return interaction.reply({ content: 'no mention' });
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }

        const player = await playerService.findOrCreate(mention);
        if (!player) return interaction.reply({ content: `User not found` });

        //Make sure to remove user from queue if they are.
        await Queue.deleteOne({ discordId: mention.id });

        const now = Date.now();
        const timeoutEnd = now + durationValue * 60 * 1000;
        const banBody = {
            startTime: now,
            reason: reason,
            timeoutInMinutes: durationValue,
            modId: user.id,
        };
        await Player.updateOne(
            { discordId: mention.id },
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

        interaction.reply({
            content: `<@${member.id}> has been timed out for ${durationValue} minutes due to "${reason}"`,
        });
    },
};
