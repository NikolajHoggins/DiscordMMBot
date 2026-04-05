import Enforcement, {
    EnforcementStatus,
    IEnforcement,
    IEditHistory,
} from '../models/enforcement.schema';
import { BansType } from '../types/bans';

export const createEnforcement = async ({
    odId,
    odDisplayName,
    modId,
    type,
    durationMinutes,
    reason,
    modNotes,
}: {
    odId: string;
    odDisplayName: string;
    modId: string;
    type: BansType;
    durationMinutes: number;
    reason: string;
    modNotes: string;
}): Promise<IEnforcement> => {
    const now = Date.now();
    return Enforcement.create({
        odId,
        odDisplayName,
        modId,
        type,
        durationMinutes,
        reason,
        modNotes,
        status: EnforcementStatus.active,
        createdAt: now,
        expiresAt: now + durationMinutes * 60 * 1000,
    });
};

export const getEnforcementById = async (id: string): Promise<IEnforcement | null> => {
    return Enforcement.findById(id);
};

export const getEnforcementsForUser = async (odId: string): Promise<IEnforcement[]> => {
    return Enforcement.find({ odId }).sort({ createdAt: -1 });
};

export const voidEnforcement = async ({
    enforcementId,
    voidedBy,
    voidReason,
}: {
    enforcementId: string;
    voidedBy: string;
    voidReason: string;
}): Promise<IEnforcement | null> => {
    return Enforcement.findByIdAndUpdate(
        enforcementId,
        {
            $set: {
                status: EnforcementStatus.voided,
                voidReason,
                voidedBy,
                voidedAt: Date.now(),
            },
        },
        { new: true }
    );
};

export const addEditHistory = async ({
    enforcementId,
    modId,
    field,
    oldValue,
    newValue,
}: {
    enforcementId: string;
    modId: string;
    field: string;
    oldValue: string;
    newValue: string;
}): Promise<IEnforcement | null> => {
    const entry: IEditHistory = {
        modId,
        field,
        oldValue,
        newValue,
        timestamp: Date.now(),
    };
    return Enforcement.findByIdAndUpdate(
        enforcementId,
        { $push: { editHistory: entry } },
        { new: true }
    );
};

export const updateModNotes = async ({
    enforcementId,
    modId,
    newNotes,
}: {
    enforcementId: string;
    modId: string;
    newNotes: string;
}): Promise<IEnforcement | null> => {
    const enforcement = await Enforcement.findById(enforcementId);
    if (!enforcement) return null;

    const oldNotes = enforcement.modNotes;
    await addEditHistory({
        enforcementId,
        modId,
        field: 'Mod Notes',
        oldValue: oldNotes || '(empty)',
        newValue: newNotes,
    });

    enforcement.modNotes = newNotes;
    await enforcement.save();
    return enforcement;
};

export const setLogMessage = async ({
    enforcementId,
    messageId,
    channelId,
}: {
    enforcementId: string;
    messageId: string;
    channelId: string;
}): Promise<void> => {
    await Enforcement.findByIdAndUpdate(enforcementId, {
        $set: { logMessageId: messageId, logChannelId: channelId },
    });
};
