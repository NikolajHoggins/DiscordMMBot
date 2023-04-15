import { Schema, model, connect } from 'mongoose';

export const MatchResultType = {
    win: 'win',
    loss: 'loss',
    draw: 'draw',
} as const;

export type MatchResultType = typeof MatchResultType[keyof typeof MatchResultType];

type MatchHistory = { match_number: number; result: MatchResultType; change: number }[];

type BanHistory = { timeoutInMinutes: number; reason: string; startTime: number; modId?: string }[];
// 1. Create an interface representing a document in MongoDB.
export interface IPlayer {
    discordId: string;
    name: string;
    rating: number;
    history: MatchHistory;
    bans: BanHistory;
    banStart: number;
    banEnd: number;
}

// 2. Create a Schema corresponding to the document interface.
const playerSchema = new Schema<IPlayer>({
    discordId: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    history: { type: [], required: true },
    bans: { type: [] },
    banStart: { type: Number },
    banEnd: { type: Number },
});

const Player = model<IPlayer>('Player', playerSchema);

export default Player;
