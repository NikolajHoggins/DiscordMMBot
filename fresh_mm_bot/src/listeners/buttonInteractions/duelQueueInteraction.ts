import { ButtonInteraction, Client, EmbedBuilder } from 'discord.js';
import * as partyService from '../../services/party.service';
import * as playerService from '../../services/player.service';
import { safelyReplyToInteraction } from '../../helpers/interactions';
import { ready } from '../../services/queue.service';
import { updateStatus } from '../../crons/updateQueue';
import { GameType, RegionsType, gameTypeQueueChannels } from '../../types/queue';
import { getConfig } from '../../services/system.service';
import { ChannelsType, RanksType } from '../../types/channel';
import { sendMessageInChannel } from '../../helpers/messages';
import { ceil } from 'lodash';

const DUEL_QUEUE_TIME = 30; // minutes

export const handleDuelQueueInteraction = async (
    interaction: ButtonInteraction,
    client: Client
) => {
    const action = interaction.customId.split('.')[1]; // 'solo' or 'party'
    const { user } = interaction;

    const config = await getConfig();
    if (!config.duelsEnabled) {
        return safelyReplyToInteraction({
            interaction,
            content: 'Duels are currently disabled',
            ephemeral: true,
        });
    }

    const player = await playerService.findOrCreate(user);

    if (player.banEnd > Date.now()) {
        return safelyReplyToInteraction({
            interaction,
            content: `You are banned from queue for ${ceil(
                (player.banEnd - Date.now()) / 1000 / 60
            )} minutes`,
            ephemeral: true,
        });
    }

    const guildMember = await interaction.guild?.members.fetch(user.id);
    if (!guildMember) throw new Error('Guild member not found');
    const userRoles = guildMember.roles.cache.map(r => r.id);
    const regionRanks = [RanksType.eu, RanksType.nae, RanksType.naw, RanksType.oce].find(r =>
        userRoles.includes(config.roles.find(role => role.name === r)?.id || '')
    );

    if (!regionRanks || regionRanks.length === 0) {
        const regionChannel = config.channels.find(c => c.name === ChannelsType.region);
        return safelyReplyToInteraction({
            interaction,
            content: `You need to select a region first in <#${regionChannel?.id}>`,
            ephemeral: true,
        });
    }

    if (action === 'party') {
        const party = await partyService.findPartyByMember(user.id);
        if (!party) {
            return safelyReplyToInteraction({
                interaction,
                content:
                    'You are not in a party. Create one with `/party create` or queue solo instead.',
                ephemeral: true,
            });
        }

        // Queue all party members
        for (const memberId of party.members) {
            const memberUser = await client.users.fetch(memberId);
            const memberPlayer = await playerService.findOrCreate(memberUser);
            await ready({
                player: memberPlayer,
                time: DUEL_QUEUE_TIME,
                region: regionRanks,
                queueRegion: RegionsType.fill,
                gameType: GameType.duels,
            });
        }

        updateStatus(client);

        const memberList = party.members.map(m => `<@${m}>`).join(', ');
        const embed = new EmbedBuilder()
            .setTitle('Duel Queue — Party')
            .setDescription(`**${party.name}** has joined the duel queue!`)
            .addFields({ name: 'Members', value: memberList })
            .setColor(0x57f287);

        const channelId = config.channels.find(
            c => c.name === gameTypeQueueChannels[GameType.duels]
        )?.id;
        if (channelId) {
            await sendMessageInChannel({
                channelId,
                messageContent: { embeds: [embed] },
                client,
            });
        }

        return safelyReplyToInteraction({
            interaction,
            content: `Your party **${party.name}** has been queued for a duel (${DUEL_QUEUE_TIME} min)`,
            ephemeral: true,
        });
    }

    // Solo queue
    await ready({
        player,
        time: DUEL_QUEUE_TIME,
        region: regionRanks,
        queueRegion: RegionsType.fill,
        gameType: GameType.duels,
    });

    updateStatus(client);

    const channelId = config.channels.find(
        c => c.name === gameTypeQueueChannels[GameType.duels]
    )?.id;
    if (channelId) {
        await sendMessageInChannel({
            channelId,
            messageContent: `${player.name} queued for a duel!`,
            client,
        });
    }

    return safelyReplyToInteraction({
        interaction,
        content: `You have been queued solo for a duel (${DUEL_QUEUE_TIME} min)`,
        ephemeral: true,
    });
};
