import { EmbedBuilder } from '@discordjs/builders';
import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema';
import { createMatchEmbed } from './embed';
import { botLog } from './messages';

export const logMatch = async ({ match, client }: { match: IMatch; client: Client }) => {
    const embed = createMatchEmbed({ match });
    botLog({ messageContent: 'Teams for match ' + match.match_number, client });
    botLog({ messageContent: { embeds: [embed] }, client });
};
