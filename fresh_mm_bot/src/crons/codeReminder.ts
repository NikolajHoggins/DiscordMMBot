import { Client } from 'discord.js';
import cron from 'node-cron';
import Match from '../models/match.schema';
import { sendMessageInChannel } from '../helpers/messages';

const SEVEN_MINUTES = 7 * 60 * 1000;

const initCodeReminderCron = (client: Client) => {
    cron.schedule('* * * * *', async () => {
        const now = Date.now();

        const matches = await Match.find({
            codeSharedAt: { $ne: null, $lte: now - SEVEN_MINUTES },
            status: 'started',
        });

        for (const match of matches) {
            try {
                await sendMessageInChannel({
                    channelId: match.channels.matchChannel,
                    client,
                    messageContent: `<@&${match.roleId}> It's been 7 minutes, as per the rules, everyone should be in the lobby. If this is not the case, ping moderators, and remaining players will be force abandoned.`,
                });
            } catch (error) {
                console.error(`Failed to send code reminder for match #${match.match_number}:`, error);
            }

            await Match.updateOne(
                { match_number: match.match_number },
                { codeSharedAt: null }
            );
        }
    });
};

export default initCodeReminderCron;
