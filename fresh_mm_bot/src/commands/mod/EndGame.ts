import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import { Command } from '../../Command';
import { getGuild } from '../../helpers/guild';
import { botLog } from '../../helpers/messages';

import * as matchService from '../../services/match.service';
import Match from '../../models/match.schema';
import { RanksType } from '../../types/channel';
import { getConfig } from '../../services/system.service';
import { isUserMod } from '../../helpers/permissions';

export const EndGame: Command = {
    name: 'end_game',
    description: 'Force end game lobby',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            name: 'match_number',
            description: 'Match number',
            type: ApplicationCommandOptionType.Integer,
            required: false,
        },
    ],

    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);
        const matchNumber = interaction.options.get('match_number')?.value as number;

        if (!member) return;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        //find match with channelId
        const match = matchNumber
            ? await Match.findOne({ match_number: matchNumber })
            : await matchService.findByChannelId(channelId);

        if (!match) {
            await interaction.reply({
                ephemeral: true,
                content: 'Not in match thread',
            });
            return;
        }

        // Create confirmation embed with button
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Confirm End Match')
            .setDescription(
                `Are you sure you want to force end match #${match.match_number}?\n\nThis will delete all channels and end the match.`
            )
            .addFields(
                { name: 'Match Number', value: `#${match.match_number}`, inline: true },
                { name: 'Status', value: match.status, inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`endgame.confirm.${match.match_number}`)
                .setLabel('Confirm End Match')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            embeds: [confirmEmbed],
            components: [row],
            ephemeral: true,
        });
    },
};
