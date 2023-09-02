import { Schema, model, connect } from 'mongoose';
import { BansType } from '../types/bans.js';

export const MatchResultType = {
    win: 'win',
    loss: 'loss',
    draw: 'draw',
    abandon: 'abandon',
} as const;

export type MatchResultType = (typeof MatchResultType)[keyof typeof MatchResultType];

type MatchHistory = { matchNumber: number; result: MatchResultType; change: number }[];

type RatingHistory = { rating: number; date: number; reason: string }[];

type BanHistory = {
    timeoutInMinutes: number;
    reason: string;
    startTime: number;
    modId?: string;
    type: BansType;
}[];

type Notes = {
    note: string;
    time: number;
    modId: string;
}[];
// 1. Create an interface representing a document in MongoDB.
export interface IPlayer {
    discordId: string;
    name: string;
    rating: number;
    history: MatchHistory;
    ratingHistory: RatingHistory;
    bans: BanHistory;
    banStart: number;
    banEnd: number;
    notes: Notes;
    avatarUrl: string;
}

// 2. Create a Schema corresponding to the document interface.
const playerSchema = new Schema<IPlayer>({
    discordId: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    history: { type: [], required: true },
    ratingHistory: { type: [], required: true },
    bans: { type: [] },
    banStart: { type: Number },
    banEnd: { type: Number },
    notes: { type: [] },
    avatarUrl: { type: String, required: true },
});

const Player = model<IPlayer>('Player', playerSchema);

export default Player;
