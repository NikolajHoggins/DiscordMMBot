import { Client, Message, TextChannel } from 'discord.js';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';

export const sendMessage = async ({
    channelId,
    messageContent,
    client,
}: {
    channelId?: string;
    client: Client;
    messageContent: string | any;
}): Promise<Message | null> => {
    return new Promise(async resolve => {
        if (!channelId) {
            throw new Error('No channel id for message ' + messageContent);
        }
        const channel = await client.channels.fetch(channelId).then(resp => resp);
        const message = await (channel as TextChannel).send(messageContent);
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
