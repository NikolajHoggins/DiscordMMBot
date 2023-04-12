import { Client, Message, MessageCreateOptions, MessagePayload, TextChannel } from 'discord.js';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';

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
