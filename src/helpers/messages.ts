import { Client, Message, TextChannel } from 'discord.js';

export const sendMessage = async ({
    channelId,
    messageContent,
    client,
}: {
    channelId: string;
    client: Client;
    messageContent: string | any;
}): Promise<Message> => {
    return new Promise(async resolve => {
        const channel = await client.channels.fetch(channelId).then(resp => resp);
        const message = await (channel as TextChannel).send(messageContent);
        resolve(message);
    });
};
