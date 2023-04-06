import { Schema, model, connect } from 'mongoose';

type MatchHistory = { match_number: number; result: 'win' | 'loss'; change: number }[];
// 1. Create an interface representing a document in MongoDB.
export interface IPlayer {
    discordId: string;
    name: string;
    rating: number;
    history: MatchHistory;
}

// 2. Create a Schema corresponding to the document interface.
const playerSchema = new Schema<IPlayer>({
    discordId: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    history: { type: [], required: true },
});

const Player = model<IPlayer>('Player', playerSchema);

export default Player;
