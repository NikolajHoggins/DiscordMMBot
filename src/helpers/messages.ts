import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    Message,
    MessageActionRowComponentBuilder,
    MessageCreateOptions,
    MessagePayload,
    TextChannel,
} from 'discord.js';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import Match, { IMatch } from '../models/match.schema.js';
import { getGuild } from './guild.js';

export const sendMessage = async ({
    channelId,
    messageContent,
    client,
}: {
    channelId?: string;
    client: Client;
    messageContent: string | MessagePayload | MessageCreateOptions;
}): Promise<Message> => {
    return new Promise(async resolve => {
        if (!channelId) {
            throw new Error('No channel id for message ' + messageContent);
        }
        const channel = await client.channels.fetch(channelId).then(resp => resp);
        if (!channel) throw new Error(`Couldn't fetch channel ${channelId} for sending message: `);
        const message = await (channel as TextChannel).send(messageContent);
        if (!message) throw new Error("Couldn't send message");

        resolve(message);
    });
};

export const botLog = async ({
    messageContent,
    client,
}: {
    messageContent: string | any;
    client: Client;
}): Promise<void> => {
    return new Promise(async resolve => {
        const logChannelId = await getChannelId(ChannelsType['bot-log']);
        sendMessage({ channelId: logChannelId, messageContent, client });

        resolve();
    });
};

export const createReadyMessage = ({
    matchNumber,
}: {
    matchNumber: number;
}): Promise<MessageCreateOptions> => {
    return new Promise(async resolve => {
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

        resolve(confirmMessageContent);
    });
};

export const sendMatchFoundMessage = ({ client, match }: { client: Client; match: IMatch }) => {
    const guild = getGuild(client);
    match.players.forEach(async p => {
        //find guild member
        const user = await client.users?.fetch(p.id);
        const readyChannel = match.channels.ready;

        if (!user) return;
        user.send(`Your match was found, go ready in <#${readyChannel}>`);
    });
};
