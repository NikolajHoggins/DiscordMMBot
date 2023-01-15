import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface IMatch {
    start: number;
    playerIds: string[];
    match_number: number;
    threadId: string;
}

// 2. Create a Schema corresponding to the document interface.
const matchSchema = new Schema<IMatch>({
    start: { type: Number, required: true },
    playerIds: { type: [], required: true },
    match_number: { type: Number, required: true },
    threadId: { type: String, required: true },
});

const Match = model<IMatch>('Match', matchSchema);

export default Match;
