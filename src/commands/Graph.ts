import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    AttachmentBuilder,
} from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getChannelId, getConfig } from '../services/system.service';
import { ChannelsType, RanksType } from '../types/channel';
import { getGuild } from '../helpers/guild';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ScriptableLineSegmentContext } from 'chart.js';
import { MatchResultType } from '../models/player.schema';

const up = (ctx: ScriptableLineSegmentContext, value: string) =>
    ctx.p0.parsed.y < ctx.p1.parsed.y ? value : undefined;
const down = (ctx: ScriptableLineSegmentContext, value: string) =>
    ctx.p0.parsed.y > ctx.p1.parsed.y ? value : undefined;
const same = <T = string>(ctx: ScriptableLineSegmentContext, value: T) =>
    ctx.p0.parsed.y === ctx.p1.parsed.y ? value : undefined;

export const Graph: Command = {
    name: 'graph',
    description: 'Get player graph?',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to get stats for',
            required: false,
        },
        {
            type: ApplicationCommandOptionType.Number,
            name: 'length',
            description: 'How many matches it should show',
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const length = (interaction.options.get('length')?.value as number) || 10;
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);
        const config = await getConfig();
        const patreonRoleId = config.roles.find(({ name }) => name === RanksType.patreon)?.id;
        const isPatreon = await member.roles.cache.some(r => r.id === patreonRoleId);
        const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;
        const isMod = await member.roles.cache.some(r => r.id === modRoleId);

        if (!isMod && mention) {
            return await interaction.reply({
                ephemeral: true,
                content: 'You can only see your own graph',
            });
        }

        const queueChannel = await getChannelId(ChannelsType['bot-commands']);
        if (interaction.channelId !== queueChannel) {
            return interaction.reply({
                content: `Keep messages in <#${queueChannel}> channel`,
                ephemeral: true,
            });
        }

        const userToCheck = mention || user;

        const player = await playerService.findOrCreate(userToCheck);
        const { ratingHistory } = player;

        // const isUnranked = player.history.length < 10;

        // if (isUnranked) {
        //     return interaction.reply({
        //         content: 'Command is only available for ranked users',
        //     });
        // }

        const ratings: {
            match: string;
            rating: number;
            result: MatchResultType;
            change: number;
        }[] = [];
        const graphHistory = ratingHistory.slice(length * -1);

        const labels = graphHistory.map(({ reason }) => reason);

        const chartConfig: ChartConfiguration = {
            type: 'line',
            options: { scales: {} },
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Last ${length} matches by ${userToCheck.username}`,
                        fill: false,
                        borderColor: 'rgb(125,125,125)',
                        data: graphHistory.map(({ rating }) => rating),
                        segment: {
                            borderColor: ctx =>
                                up(ctx, 'rgb(0,255,0)') ||
                                down(ctx, 'rgb(255,0,0)') ||
                                same(ctx, 'rgb(125,125,125)'),
                            // borderDash: ctx => same(ctx, [4, 4]),
                        },
                    },
                ],
            },
        };

        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });

        const image = await chartJSNodeCanvas.renderToBuffer(chartConfig);
        const attachment = new AttachmentBuilder(image);

        await interaction.reply({
            files: [attachment],
        });
    },
};
