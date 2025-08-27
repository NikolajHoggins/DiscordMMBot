import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    Message,
    MessageActionRowComponentBuilder,
    MessageCreateOptions,
    MessagePayload,
    StringSelectMenuBuilder,
    TextChannel,
} from 'discord.js';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import Match, { IMatch } from '../models/match.schema';
import { getGuild } from './guild';

export const sendMessageInChannel = async ({
    channelId,
    messageContent,
    client,
}: {
    channelId?: string;
    client: Client;
    messageContent: string | MessagePayload | MessageCreateOptions;
}): Promise<Message> => {
    if (!channelId) {
        throw new Error('No channel id for message ' + messageContent);
    }
    const channel = await client.channels.fetch(channelId).then(resp => resp);
    if (!channel) throw new Error(`Couldn't fetch channel ${channelId} for sending message: `);
    const message = await (channel as TextChannel).send(messageContent);
    if (!message) throw new Error("Couldn't send message");

    return message;
};

export const botLog = async ({
    messageContent,
    client,
}: {
    messageContent: string | any;
    client: Client;
}): Promise<void> => {
    const logChannelId = await getChannelId(ChannelsType['bot-log']);
    sendMessageInChannel({ channelId: logChannelId, messageContent, client });
};

export const createReadyMessage = async ({
    matchNumber,
}: {
    matchNumber: number;
}): Promise<MessageCreateOptions> => {
    const match = await Match.findOne({ match_number: matchNumber });
    if (!match) throw new Error('Match not found');

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

    row.addComponents(
        new ButtonBuilder()
            .setCustomId('match.confirm')
            .setLabel('Ready')
            .setStyle(ButtonStyle.Success)
    );

    const confirmMessageContent = {
        content: `Confirm you are ready to play with the button below. If you cannot play do /abandon`,
        components: [row],
    };
    return confirmMessageContent;
};

export const sendMatchFoundMessage = ({ client, match }: { client: Client; match: IMatch }) => {
    match.players.forEach(async p => {
        //find guild member
        const user = await client.users?.fetch(p.id);
        const readyChannel = match.channels.ready;

        if (!user) return;
        await sendDirectMessage({
            client,
            userId: user.id,
            message: `Your match was found, go ready in <#${readyChannel}>`,
        });
    });
};

export const sendMvpVoteMessage = async ({ client, match }: { client: Client; match: IMatch }) => {
    const mvpEmbed = new EmbedBuilder()
        .setTitle(`MVP Voting for match #${match.match_number}`)
        .setDescription(
            'Select the MVP from the dropdown below. You can only vote for one person, and on your own team.'
        )
        .setTimestamp();

    const teamADropDown = new StringSelectMenuBuilder()
        .setCustomId('mvp-team-a')
        .setPlaceholder('Team A')
        .addOptions(
            match.players
                .filter(player => player.team === 'a')
                .map(player => ({
                    label: player.name,
                    value: player.id,
                }))
        );

    const teamBDropDown = new StringSelectMenuBuilder()
        .setCustomId('mvp-team-b')
        .setPlaceholder('Team B')
        .addOptions(
            match.players
                .filter(player => player.team === 'b')
                .map(player => ({
                    label: player.name,
                    value: player.id,
                }))
        );

    const mvpRowTeamA = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    mvpRowTeamA.addComponents(teamADropDown);

    const mvpRowTeamB = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    mvpRowTeamB.addComponents(teamBDropDown);

    const mvpContent = {
        embeds: [mvpEmbed],
        components: [mvpRowTeamA, mvpRowTeamB],
    };

    await sendMessageInChannel({
        channelId: match.channels.matchChannel,
        messageContent: mvpContent,
        client,
    });
};

export const sendDirectMessage = async ({
    client,
    userId,
    message,
}: {
    client: Client;
    userId: string;
    message: string;
}) => {
    const user = await client.users.fetch(userId);
    if (!user) return;
    try {
        await user.send(message);
    } catch (error) {
        botLog({
            messageContent: `Failed to send direct message to <@${userId}> \n${message}`,
            client,
        });
    }
};
