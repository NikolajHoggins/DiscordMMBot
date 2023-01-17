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
