import { Schema, model, Document } from 'mongoose';
import { BansType } from '../types/bans';

export const EnforcementStatus = {
    active: 'active',
    voided: 'voided',
    expired: 'expired',
} as const;

export type EnforcementStatus = (typeof EnforcementStatus)[keyof typeof EnforcementStatus];

export interface IEditHistory {
    modId: string;
    field: string;
    oldValue: string;
    newValue: string;
    timestamp: number;
}

export interface IEnforcement extends Document {
    odId: string;
    odDisplayName: string;
    modId: string;
    type: BansType;
    durationMinutes: number;
    reason: string;
    modNotes: string;
    status: EnforcementStatus;
    voidReason: string;
    voidedBy: string;
    voidedAt: number;
    editHistory: IEditHistory[];
    logMessageId: string;
    logChannelId: string;
    createdAt: number;
    expiresAt: number;
}

const enforcementSchema = new Schema<IEnforcement>({
    odId: { type: String, required: true, index: true },
    odDisplayName: { type: String, required: true },
    modId: { type: String },
    type: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    reason: { type: String, required: true },
    modNotes: { type: String, default: '' },
    status: { type: String, required: true, default: EnforcementStatus.active },
    voidReason: { type: String, default: '' },
    voidedBy: { type: String, default: '' },
    voidedAt: { type: Number, default: 0 },
    editHistory: { type: [], default: [] },
    logMessageId: { type: String, default: '' },
    logChannelId: { type: String, default: '' },
    createdAt: { type: Number, required: true },
    expiresAt: { type: Number, required: true },
});

const Enforcement = model<IEnforcement>('Enforcement', enforcementSchema);

export default Enforcement;
