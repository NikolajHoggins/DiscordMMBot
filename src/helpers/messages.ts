import { Client, Message, TextChannel } from 'discord.js';

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
            resolve(null);
            return;
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
    return new Promise(resolve => {
        if (process.env.LOG_CHANNEL) {
            sendMessage({ channelId: process.env.LOG_CHANNEL, messageContent, client });
        }
        resolve();
    });
};
