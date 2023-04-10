import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface IMatchChannels {
    ready?: string;
    teamA?: string;
    teamB?: string;
    matchChannel?: string;
    teamAVoice?: string;
    teamBVoice?: string;
}

export interface IMatchPlayer {
    id: string;
    team: 'a' | 'b';
    vote?: string;
    ready?: boolean;
}

export const MatchStatus = {
    pending: 'pending',
    started: 'started',
    ended: 'ended',
} as const;

export type MatchStatus = typeof MatchStatus[keyof typeof MatchStatus];

export interface IMatch {
    start: number;
    match_number: number;
    channels: IMatchChannels;
    status: MatchStatus;
    roleId: string;
    players: IMatchPlayer[];
    teamARounds?: number;
    teamBRounds?: number;
    version: number;
}

// 2. Create a Schema corresponding to the document interface.
const matchSchema = new Schema<IMatch>({
    start: { type: Number, required: true },
    players: { type: [], required: true },
    match_number: { type: Number, required: true },
    channels: { type: {}, required: true },
    status: { type: String, required: true },
    roleId: { type: String, required: true },
    teamARounds: { type: Number },
    teamBRounds: { type: Number },
    version: { type: Number, required: true },
});

const Match = model<IMatch>('Match', matchSchema);

export default Match;
