import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema';
import { botLog, sendMessage } from './messages';
import { getTeam } from './players';
import { createMatchLogEmbed } from './embed';

export const logMatch = async ({ match, client }: { match: IMatch; client: Client }) => {
    const embed = await createMatchLogEmbed({ matchNumber: match.match_number });

    botLog({ messageContent: { embeds: [embed] }, client });
};
