import Party, { IParty } from '../models/party.schema';

export const createParty = async (name: string, leaderId: string): Promise<IParty> => {
    const existing = await Party.findOne({ name });
    if (existing) throw new Error('A party with that name already exists');

    const userParty = await findPartyByMember(leaderId);
    if (userParty) throw new Error('You are already in a party');

    const party = await Party.create({
        name,
        leaderId,
        members: [leaderId],
    });
    return party;
};

export const findPartyByMember = async (discordId: string): Promise<IParty | null> => {
    return Party.findOne({ members: discordId });
};

export const findPartyByName = async (name: string): Promise<IParty | null> => {
    return Party.findOne({ name });
};

export const addMember = async (partyName: string, discordId: string): Promise<IParty> => {
    const party = await Party.findOne({ name: partyName });
    if (!party) throw new Error('Party not found');

    if (party.members.includes(discordId)) throw new Error('Already in this party');

    const existingParty = await findPartyByMember(discordId);
    if (existingParty) throw new Error('User is already in another party');

    party.members.push(discordId);
    await party.save();
    return party;
};

export const removeMember = async (discordId: string): Promise<IParty | null> => {
    const party = await Party.findOne({ members: discordId });
    if (!party) throw new Error('You are not in a party');

    if (party.leaderId === discordId) {
        throw new Error('The leader cannot leave. Use /party disband instead');
    }

    party.members = party.members.filter(m => m !== discordId);
    await party.save();
    return party;
};

export const disbandParty = async (discordId: string): Promise<string> => {
    const party = await Party.findOne({ members: discordId });
    if (!party) throw new Error('You are not in a party');

    if (party.leaderId !== discordId) {
        throw new Error('Only the party leader can disband the party');
    }

    const name = party.name;
    await Party.deleteOne({ _id: party._id });
    return name;
};
