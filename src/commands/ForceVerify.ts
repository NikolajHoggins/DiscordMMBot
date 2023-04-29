import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
} from 'discord.js';
import { capitalize, ceil, floor } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getRankName } from '../helpers/rank.js';
import { getGuild } from '../helpers/guild.js';
import { findByChannelId, setScore } from '../services/match.service.js';
import { getTeamBName } from '../helpers/team.js';
import { MatchStatus } from '../models/match.schema.js';
import { finishMatch } from '../services/match.service.js';
import { getConfig } from '../services/system.service.js';
import { RanksType } from '../types/channel.js';

export const ForceVerify: Command = {
    name: 'force_verify',
    description: 'Force verify a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        const config = await getConfig();
        const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;
        const isMod = await member.roles.cache.some(r => r.id === modRoleId);

        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
        }

        const match = await findByChannelId(channelId);
        if (!match) {
            await interaction.reply({
                ephemeral: true,
                content: 'Command only works in match thread',
            });
            return;
        }
        if (match.status !== MatchStatus.started) {
            await interaction.reply({
                ephemeral: true,
                content: 'Match not in started state',
            });
            return;
        }
        if (match.teamARounds === undefined || match.teamBRounds === undefined) {
            await interaction.reply({
                ephemeral: true,
                content: 'Match scores not submitted',
            });
            return;
        }
        await finishMatch({
            matchNumber: match.match_number,
            client: client,
        });

        await interaction.reply({
            content: 'Match verified',
        });
    },
};
