import { Schema, model, connect, ObjectId } from 'mongoose';
import { ChannelType, RankType } from '../types/channel';
import { MapType } from '../types/map.js';
import { EmotesType } from '../types/emotes.js';

// 1. Create an interface representing a document in MongoDB.
export interface ISystem {
    last_ping: number;
    channels: ChannelType[];
    regionQueue: boolean;
    duelsEnabled: boolean;
    roles: RankType[];
    maps: MapType[];
    duelsMaps: MapType[];
    teams: string[];
    emotes: EmotesType;
    winScore: number;
    partyEnabled: boolean;
    partyMaxSize: number;
    partyMinSize: number;
    partyPreventOverfill: boolean;
    matchTeamMode: string;
    matchCaptainSelection: string;
    matchDraftType: string;
    matchFirstPick: string;
    matchAutoMute: boolean;
    _id: ObjectId;
}

// 2. Create a Schema corresponding to the document interface.
const systemSchema = new Schema<ISystem>({
    last_ping: { type: Number, required: true },
    channels: { type: [], required: true },
    roles: { type: [], required: true },
    maps: { type: [], required: true },
    duelsEnabled: { type: Boolean, required: true },
    duelsMaps: { type: [], required: true },
    teams: { type: [], required: true },
    emotes: { type: {}, required: true },
    regionQueue: { type: Boolean, required: true },
    winScore: { type: Number, required: true },
    partyEnabled: { type: Boolean, default: false },
    partyMaxSize: { type: Number, default: 4 },
    partyMinSize: { type: Number, default: 2 },
    partyPreventOverfill: { type: Boolean, default: true },
    matchTeamMode: { type: String, default: 'balanced' },
    matchCaptainSelection: { type: String, default: 'two_highest_elo' },
    matchDraftType: { type: String, default: 'snake' },
    matchFirstPick: { type: String, default: 'highest_elo_captain' },
    matchAutoMute: { type: Boolean, default: false },
});

const System = model<ISystem>('System', systemSchema);

export default System;
