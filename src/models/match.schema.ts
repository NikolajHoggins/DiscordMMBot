import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface MatchChannels {
    ready?: string;
    teamA?: string;
    teamB?: string;
    matchChannel?: string;
    teamAVoice?: string;
    teamBVoice?: string;
}
export interface IMatch {
    start: number;
    match_number: number;
    channels: MatchChannels;
    status: 'pending' | 'started' | 'ended';
    roleId: string;
    teamA: string[];
    teamB: string[];
    teamARounds?: number;
    teamBRounds?: number;
}

// 2. Create a Schema corresponding to the document interface.
const matchSchema = new Schema<IMatch>({
    start: { type: Number, required: true },
    teamA: { type: [], required: true },
    teamB: { type: [], required: true },
    match_number: { type: Number, required: true },
    channels: { type: {}, required: true },
    status: { type: String, required: true },
    roleId: { type: String, required: true },
    teamARounds: { type: Number },
    teamBRounds: { type: Number },
});

const Match = model<IMatch>('Match', matchSchema);

export default Match;
