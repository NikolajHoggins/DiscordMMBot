import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { last } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';

// const emojis = {
//     w: '<:BR_W:1095827374655934604>',
//     l: '<:BR_L:1095827371971596408>',
//     d: '<:BR_D:1095827346931601458>',
// };

// const getEmoji = (result: string) => {
//     if (['w', 'l', 'd'].includes(result)) return emojis[result as 'w' | 'l' | 'd'];
//     return '';
// };
export const RatingChange: Command = {
    name: 'rating_change',
    description: 'Get your last match rating change',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;

        const player = await playerService.findOrCreate(user);
        const { history } = player;
        if (history.length < 10)
            return interaction.reply({
                content: `You need to play at least 10 matches to use this command`,
                ephemeral: true,
            });
        const lastMatch = last(history);
        if (!lastMatch) return interaction.reply({ content: `You have no matches played` });

        interaction.reply({
            content: `Your last match rating change from match ${lastMatch.matchNumber} was a ${
                lastMatch.result
            } and resulted in ${Math.floor(lastMatch.change)} elo`,
        });
    },
};
