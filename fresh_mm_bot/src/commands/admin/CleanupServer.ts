import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
    EmbedBuilder,
    TextChannel,
} from 'discord.js';
import { Command } from '../../Command';
import { getConfig, updateConfig } from '../../services/system.service';
import { getGuild } from '../../helpers/guild';

const LOG_CHANNEL_ID = '1489785584925937730';

export const CleanupServer: Command = {
    name: 'cleanup_server',
    description: 'Delete all bot-created channels and wipe config for fresh recreation on restart',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
    options: [],
    run: async (client: Client, interaction: CommandInteraction) => {
        await interaction.deferReply({ ephemeral: true });

        const config = await getConfig();
        const guild = await getGuild(client);
        if (!guild) {
            await interaction.editReply('Could not find guild.');
            return;
        }

        const deleted: string[] = [];
        const failed: string[] = [];

        // Delete every channel/category the bot registered in its config
        for (const ch of config.channels) {
            try {
                const guildChannel = await guild.channels.fetch(ch.id).catch(() => null);
                if (guildChannel) {
                    await guildChannel.delete(`cleanup_server command by ${interaction.user.tag}`);
                    deleted.push(ch.name);
                }
            } catch (e) {
                failed.push(ch.name);
            }
        }

        // Wipe channels from the DB config so scaffold recreates them on next boot
        await updateConfig({ id: config._id, body: { channels: [] } });

        const embed = new EmbedBuilder()
            .setTitle('🧹 Server Cleanup Executed')
            .setColor('#FF6B00')
            .addFields(
                {
                    name: `Deleted (${deleted.length})`,
                    value: deleted.length ? deleted.map(n => `\`${n}\``).join(', ') : 'none',
                    inline: false,
                },
                ...(failed.length
                    ? [
                          {
                              name: `Failed (${failed.length})`,
                              value: failed.map(n => `\`${n}\``).join(', '),
                              inline: false,
                          },
                      ]
                    : []),
                {
                    name: 'Next Step',
                    value: 'Config cleared. Restart the bot to recreate all channels fresh.',
                    inline: false,
                }
            )
            .setFooter({ text: `Executed by ${interaction.user.tag}` })
            .setTimestamp();

        // Send log embed to the designated log channel
        try {
            const logChannel = (await client.channels.fetch(LOG_CHANNEL_ID)) as TextChannel;
            if (logChannel) await logChannel.send({ embeds: [embed] });
        } catch (e) {
            console.error('Failed to send cleanup log:', e);
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
