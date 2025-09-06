import { AttachmentBuilder, Client } from 'discord.js';
import cron from 'node-cron';
import { sendMessageInChannel } from '../helpers/messages';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import path from 'path';

export const postAimHero = async (client: Client) => {
    try {
        const rankedQueueChannelId = await getChannelId(ChannelsType['ranked-queue']);
        const imagePath = path.resolve(process.cwd(), 'src', 'images', 'vr-aim-ad.png');
        const attachment = new AttachmentBuilder(imagePath);

        await sendMessageInChannel({
            channelId: rankedQueueChannelId,
            messageContent: {
                content:
                    "# I'm making a VR Aim Trainer\nThe first Aim Trainer actually tailored for VR.\n\nCheck it out at https://vr-aim.com?utm_source=vailranked\n\n Or join the discord\nhttps://discord.gg/5uHFmM6sWH",
                files: [attachment],
            },
            client,
        });
    } catch (error) {
        console.error('Failed to post aim hero image', error);
    }
};

const initPostAimHeroCron = async (client: Client) => {
    // Every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        postAimHero(client);
    });
};

export default initPostAimHeroCron;
