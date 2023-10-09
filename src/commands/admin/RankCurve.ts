import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    AttachmentBuilder,
    PermissionFlagsBits,
} from 'discord.js';

import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ScriptableLineSegmentContext } from 'chart.js';
import { Chart } from 'chart.js';
import Player from '../../models/player.schema';
import { rankColors, rankCutoffs } from '../../helpers/rank';
import { Command } from '../../Command';
import { RanksType } from '../../types/channel';
import { repeat } from 'lodash';

const up = (ctx: ScriptableLineSegmentContext, value: string) =>
    ctx.p0.parsed.y < ctx.p1.parsed.y ? value : undefined;
const down = (ctx: ScriptableLineSegmentContext, value: string) =>
    ctx.p0.parsed.y > ctx.p1.parsed.y ? value : undefined;
const same = <T = string>(ctx: ScriptableLineSegmentContext, value: T) =>
    ctx.p0.parsed.y === ctx.p1.parsed.y ? value : undefined;
Chart.defaults.font.family = 'DejaVu Sans'; // or any other font you've installed

export const RankCurve: Command = {
    name: 'rankcurve',
    description: 'Get rank curve',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.Administrator],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const HOGGINS_DISCORD_ID = '241759050155425803';
        if (user.id !== HOGGINS_DISCORD_ID)
            return interaction.reply({
                content: 'You are not authorized to use this command',
                ephemeral: true,
            });

        const rankCounts: Partial<Record<RanksType, number>> = {};
        const rankKeys = Object.keys(rankCutoffs).map(Number);
        for (let i = 0; i < rankKeys.length; i++) {
            const lowerBound = rankKeys[i];
            const upperBound = rankKeys[i + 1] || Infinity;
            const rank = rankCutoffs[lowerBound as keyof typeof rankCutoffs];
            const count = await Player.countDocuments({
                rating: { $gte: lowerBound, $lt: upperBound },
                $expr: { $gte: [{ $size: '$history' }, 10] },
            });

            rankCounts[rank as keyof typeof rankCounts] = count;
        }

        console.log('got rank counts', rankCounts);

        const chartConfig: ChartConfiguration = {
            type: 'bar',
            options: {
                scales: {},
            },
            data: {
                labels: Object.keys(rankCounts),
                datasets: [
                    {
                        label: `Ranks split`,
                        fill: false,
                        borderColor: 'rgb(125,125,125)',
                        data: Object.keys(rankCounts).map(key => rankCounts[key as RanksType] || 0),
                        backgroundColor: Object.keys(rankCounts).map(
                            key => rankColors[key as RanksType] || '#000000'
                        ),
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

        // await interaction.reply({
        //     content: 'hello',
        // });
        await interaction.reply({
            files: [attachment],
        });
    },
};
