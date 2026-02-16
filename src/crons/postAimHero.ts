import { AttachmentBuilder, Client, TextChannel } from 'discord.js';
import cron from 'node-cron';
import { sendMessageInChannel } from '../helpers/messages';
import { getChannelId } from '../services/system.service';
import { ChannelsType } from '../types/channel';
import path from 'path';

export const postAimHero = async (client: Client) => {
    try {
        const rankedQueueChannelId = await getChannelId(ChannelsType['ranked-queue']);

        // Check if any of the last 20 messages already contain a VR AIM ad
        const channel = await client.channels.fetch(rankedQueueChannelId);
        if (channel) {
            const messages = await (channel as TextChannel).messages.fetch({ limit: 20 });
            const hasRecentAd = messages.some(msg => msg.content.includes('VR AIM'));
            if (hasRecentAd) return;
        }

        const game = process.env.DB_NAME === 'breachers' ? 'breachers' : 'vail';
        const imagePath = path.resolve(process.cwd(), 'src', 'images', 'vr-aim-ad.jpg');
        const attachment = new AttachmentBuilder(imagePath);

        await sendMessageInChannel({
            channelId: rankedQueueChannelId,
            messageContent: {
                content:
                    `# VR AIM\nThe first Aim Trainer actually tailored for VR.\n\nCheck it out at https://vraim.com/${game}\n\nOr join the discord\nhttps://discord.gg/vraim`,
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
    cron.schedule('0 */13 * * *', async () => {
        postAimHero(client);
    });
};

export default initPostAimHeroCron;
