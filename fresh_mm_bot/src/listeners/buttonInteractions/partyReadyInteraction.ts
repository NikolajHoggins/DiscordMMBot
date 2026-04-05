import {
    ButtonInteraction,
    Client,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import { safelyReplyToInteraction } from '../../helpers/interactions';
import { handleReady } from '../../commands/Ready';
import { GameType, RegionsType, gameTypeQueueChannels } from '../../types/queue';
import * as partyService from '../../services/party.service';
import * as playerService from '../../services/player.service';
import Match from '../../models/match.schema';
import { updateStatus } from '../../crons/updateQueue';
import { ready } from '../../services/queue.service';
import { getConfig } from '../../services/system.service';
import { ChannelsType, RanksType } from '../../types/channel';
import { ceil } from 'lodash';
import { sendMessageInChannel } from '../../helpers/messages';

/**
 * Called when a player clicks 60m or 30m ready-up button and is in a party.
 * Shows a selection embed: one button per party group + solo queue button.
 * customId: ready.<time>.<region>.<gameType>
 */
export const showPartyQueuePrompt = async (
    interaction: ButtonInteraction,
    client: Client,
    time: number,
    region: RegionsType,
    gameType: GameType
) => {
    const party = await partyService.findPartyByMember(interaction.user.id);
    if (!party) {
        // No party — proceed to normal queue
        return handleReady({ interaction, time, client, region, gameType });
    }

    // Fetch display names for party members
    const memberLines: string[] = [];
    for (const memberId of party.members) {
        const tag = memberId === party.leaderId ? '👑 ' : '';
        memberLines.push(`${tag}<@${memberId}>`);
    }

    const embed = new EmbedBuilder()
        .setTitle('How would you like to queue?')
        .setColor(0x5865f2)
        .addFields({
            name: `🎮 Party: ${party.name} (${party.members.length} player${party.members.length !== 1 ? 's' : ''})`,
            value: memberLines.join('\n'),
            inline: false,
        });

    // Encode time/region/gameType into the customId
    const encoded = `${time}.${region}.${gameType}`;

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`partyReady.party.${encoded}.${party.name}`)
            .setLabel(`Queue with ${party.name}`)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`partyReady.solo.${encoded}`)
            .setLabel('Solo Queue')
            .setStyle(ButtonStyle.Secondary)
    );

    return safelyReplyToInteraction({
        interaction,
        embeds: [embed],
        components: [row],
        ephemeral: true,
    });
};

/**
 * Handles the follow-up partyReady.* button clicks.
 * customId: partyReady.<mode>.<time>.<region>.<gameType>[.<partyName>]
 */
export const handlePartyReadyInteraction = async (
    interaction: ButtonInteraction,
    client: Client
) => {
    const parts = interaction.customId.split('.');
    // parts: ['partyReady', mode, time, region, gameType, ...partyName?]
    const mode = parts[1]; // 'solo' or 'party'
    const time = parseInt(parts[2]);
    const region = parts[3] as RegionsType;
    const gameType = parts[4] as GameType;

    if (mode === 'solo') {
        return handleReady({ interaction, time, client, region, gameType });
    }

    if (mode === 'party') {
        const partyName = parts.slice(5).join('.'); // handle party names with dots
        const party = await partyService.findPartyByName(partyName);
        if (!party) {
            return safelyReplyToInteraction({
                interaction,
                content: 'Party not found — it may have been disbanded.',
                ephemeral: true,
            });
        }

        if (!party.members.includes(interaction.user.id)) {
            return safelyReplyToInteraction({
                interaction,
                content: 'You are no longer in this party.',
                ephemeral: true,
            });
        }

        // Only the leader can queue the party
        if (party.leaderId !== interaction.user.id) {
            return safelyReplyToInteraction({
                interaction,
                content: 'Only the party leader can queue the party.',
                ephemeral: true,
            });
        }

        // Validate leader can queue (ban check, region check)
        const leaderPlayer = await playerService.findOrCreate(interaction.user);
        const guildMember = await interaction.guild?.members.fetch(interaction.user.id);
        if (!guildMember) throw new Error('Guild member not found');
        const userRoles = guildMember.roles.cache.map(r => r.id);
        const config = await getConfig();
        const regionRank = [RanksType.eu, RanksType.nae, RanksType.naw, RanksType.oce].find(r =>
            userRoles.includes(config.roles.find(role => role.name === r)?.id || '')
        );
        if (!regionRank) {
            const regionChannel = config.channels.find(c => c.name === ChannelsType.region);
            return safelyReplyToInteraction({
                interaction,
                content: `You need to select a region first in <#${regionChannel?.id}>`,
                ephemeral: true,
            });
        }

        if (leaderPlayer.banEnd > Date.now()) {
            return safelyReplyToInteraction({
                interaction,
                content: `You are banned from queue for ${ceil((leaderPlayer.banEnd - Date.now()) / 1000 / 60)} minutes`,
                ephemeral: true,
            });
        }

        // Queue every party member
        const queued: string[] = [];
        const failed: string[] = [];

        for (const memberId of party.members) {
            try {
                const memberUser = await client.users.fetch(memberId);
                const memberPlayer = await playerService.findOrCreate(memberUser);

                if (memberPlayer.banEnd > Date.now()) {
                    failed.push(`<@${memberId}> (suspended)`);
                    continue;
                }

                // Check if already in an active match
                const inMatch = await Match.findOne({
                    status: { $ne: 'ended' },
                    'players.id': memberId,
                });
                if (inMatch) {
                    failed.push(`<@${memberId}> (in a match)`);
                    continue;
                }

                await ready({
                    player: memberPlayer,
                    time,
                    region: regionRank,
                    queueRegion: region,
                    gameType,
                });
                queued.push(`<@${memberId}>`);
            } catch {
                failed.push(`<@${memberId}>`);
            }
        }

        updateStatus(client);

        // Post a minimal message in the queue channel: leader + member count
        if (queued.length > 0) {
            try {
                const channelsType = gameTypeQueueChannels[gameType];
                const queueChannelId = await getConfig().then(
                    config => config.channels.find(c => c.name === channelsType)?.id
                );
                if (queueChannelId) {
                    await sendMessageInChannel({
                        channelId: queueChannelId,
                        messageContent: `<@${party.leaderId}> queued with a party of ${queued.length}`,
                        client,
                    });
                }
            } catch {}
        }

        const lines = [`Queued (${queued.length}): ${queued.join(', ') || 'none'}`];
        if (failed.length) lines.push(`Could not queue (${failed.length}): ${failed.join(', ')}`);
        lines.push(`Queue time: ${time} minutes`);

        return safelyReplyToInteraction({
            interaction,
            content: lines.join('\n'),
            ephemeral: true,
        });
    }
};
