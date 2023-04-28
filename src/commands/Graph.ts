import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    AttachmentBuilder,
} from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { getChannelId } from '../services/system.service.js';
import { ChannelsType } from '../types/channel.js';
import { getGuild } from '../helpers/guild.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

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
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);

        const isMod = await member.roles.cache.some(r => r.id === process.env.MOD_ROLE_ID);
        if (!isMod) {
            await interaction.reply({
                ephemeral: true,
                content: 'no perms',
            });
            return;
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
        const { history } = player;

        const isUnranked = player.history.length < 10;

        if (isUnranked) {
            return interaction.reply({
                content: 'Command is only available for ranked users',
            });
        }

        const ratings: {
            match: string;
            rating: number;
            result: 'win' | 'loss' | 'draw';
            change: number;
        }[] = [];
        const graphHistory = history.length > 10 ? history.slice(-10) : history;

        graphHistory.reverse().forEach((match, i) => {
            const previousRating = i === 0 ? player.rating : ratings[i - 1].rating;
            const previousChange = i === 0 ? 0 : ratings[i - 1].change;
            const currentRating = previousRating + previousChange * -1;
            ratings.push({
                match: match.matchNumber.toString(),
                rating: currentRating,
                result: match.result,
                change: match.change,
            });
        });
        const correctRatings = ratings.reverse();
        const labels = correctRatings.map(({ match }) => match);
        const wins = correctRatings.map(({ rating }, i) => {
            if (i === 0 && correctRatings[i + 1].result !== 'win') return null;
            if (correctRatings[i + 1]?.result === 'win' || correctRatings[i]?.result === 'win')
                return rating;
            return null;
        });
        const losses = correctRatings.map(({ rating }, i) => {
            //handle first spot
            if (i === 0 && correctRatings[i + 1].result !== 'loss') return null;
            if (correctRatings[i + 1]?.result === 'loss' || correctRatings[i]?.result === 'loss')
                return rating;
            return null;
        });
        const draws = correctRatings.map(({ rating }, i) => {
            if (i === 0 && correctRatings[i + 1].result !== 'draw') return null;
            if (correctRatings[i + 1]?.result === 'draw' || correctRatings[i]?.result === 'draw')
                return rating;
            return null;
        });

        const config: ChartConfiguration = {
            type: 'line',
            options: { scales: {} },
            data: {
                labels: labels,
                datasets: [
                    { label: 'Wins', fill: false, borderColor: 'rgb(0,255,0)', data: wins },
                    { label: 'Losses', fill: false, borderColor: 'rgb(255,0,0)', data: losses },
                    { label: 'Draws', fill: false, borderColor: 'rgb(122,122,122)', data: draws },
                ],
            },
        };

        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });

        const image = await chartJSNodeCanvas.renderToBuffer(config);
        const attachment = new AttachmentBuilder(image);

        await interaction.reply({
            files: [attachment],
        });
    },
};
