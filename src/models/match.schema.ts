import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface IMatch {
    start: number;
    match_number: number;
    channelId: string;
    roleId: string;
    teamA: string[];
    teamB: string[];
}

// 2. Create a Schema corresponding to the document interface.
const matchSchema = new Schema<IMatch>({
    start: { type: Number, required: true },
    teamA: { type: [], required: true },
    teamB: { type: [], required: true },
    match_number: { type: Number, required: true },
    channelId: { type: String, required: true },
    roleId: { type: String, required: true },
});

const Match = model<IMatch>('Match', matchSchema);

export default Match;
