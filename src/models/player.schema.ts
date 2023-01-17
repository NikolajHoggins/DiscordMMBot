import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface IPlayer {
    discordId: string;
    name: string;
    rating: string;
    wins: number;
    losses: number;
}

// 2. Create a Schema corresponding to the document interface.
const playerSchema = new Schema<IPlayer>({
    discordId: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: String, required: true },
    wins: { type: Number, required: true },
    losses: { type: Number, required: true },
});

const Player = model<IPlayer>('Player', playerSchema);

export default Player;
