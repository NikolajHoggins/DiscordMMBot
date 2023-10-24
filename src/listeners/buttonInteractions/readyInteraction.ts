import { ButtonInteraction, Client } from 'discord.js';
import { handleUnready } from '../../commands/Unready';
import { handleReady } from '../../commands/Ready';
import { GameType, RegionsType } from '../../types/queue';
import Match from '../../models/match.schema';
import { getDuelsEnabled } from '../../services/system.service';

const contestants = [
    '512479402743824385',
    '204709337438879744',
    '406824902180470787',
    '855542436494311435',
    '719102018886565919',
    '767242575756263444',
    '692078114305474581',
    '422905258134470676',
    '1030967253258215434',
    '614865086804394012',
    '714583677841047575',
    '1083583927115063428',
    '533385740575309836',
    '549733941657993236',
    '950456482934165574',
    '403216493057146881',
    '715169821339418674',
    '1098082952304414720',
    '290209006088355861',
    '988845538566873128',
    '860033296260268033',
    '292479572279164939',
    '563953331924500490',
    '706936961335558164',
    '331363838769496065',
    '1021072346578169948',
    '712098182288375889',
    '933082482448945183',
    '667413968175890442',
    '535555614412242956',
    '565802825523920908',
    '1006032812408840292',
    '688680032465715309',
    '718863700601077790',
    '701031867272396801',
    '725775187999457371',
    '976191064488693821',
    '880467579737636885',
    '327878522653900810',
    '423109584304209923',
    '634463860966817808',
    '267601215163072512',
    '1075257479400796200',
    '1114412302544928809',
    '225911005333553152',
    '540990311715962880',
    '559803574784098306',
    '818147738133987369',
];

export const handleReadyInteraction = async (interaction: ButtonInteraction, client: Client) => {
    const action = interaction.customId.split('.')[1];
    const region = interaction.customId.split('.')[2] as RegionsType;
    const gameType = interaction.customId.split('.')[3] as GameType;

    if (gameType === GameType.duels) {
        const duelsEnabled = await getDuelsEnabled();
        if (!duelsEnabled) {
            interaction.reply({
                content: `Duels is currently disabled`,
                ephemeral: true,
            });
            return;
        }

        if (!contestants.includes(interaction.user.id)) {
            interaction.reply({
                content: `1v1s are currently reserved for people competing in the crest league tournament. \nI will create a secondary queue for non-contestants soon.`,
                ephemeral: true,
            });
            return;
        }
    }

    const { user } = interaction;

    const time = parseInt(action);

    //Check if match with player on it is in progress
    const match = await Match.find({ status: { $ne: 'ended' } }).findOne({
        'players.id': user.id,
    });

    if (match) {
        if (match.status === 'started') {
            interaction.reply({
                content: `You cannot queue while in a running match`,
                ephemeral: true,
            });
        }
        if (action === 'unready') {
            await setPlayerRequeue({
                interaction,
                matchNumber: match.match_number,
                reQueue: false,
            });
            interaction.reply({
                content: `You will no longer auto requeue`,
                ephemeral: true,
            });
            return;
        }
        await setPlayerRequeue({
            interaction,
            matchNumber: match.match_number,
            reQueue: true,
        });
        interaction.reply({
            content: `If your current match doesn't get accepted, you will be added to queue in fill for 5 minutes. Unqueue now if you don't want to be automatically added to queue.`,
            ephemeral: true,
        });
        return;
    }

    if (action === 'unready') {
        return await handleUnready(client, interaction);
    }

    handleReady({
        client,
        interaction,
        time,
        region: region.toLocaleLowerCase() as RegionsType,
        gameType,
    });
};

export const setPlayerRequeue = async ({
    interaction,
    matchNumber,
    reQueue,
}: {
    interaction: ButtonInteraction;
    matchNumber: number;
    reQueue: boolean;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');

        const result = await Match.updateOne(
            {
                match_number: match.match_number,
                'players.id': interaction.user.id,
                version: match.version,
            },
            { $set: { 'players.$.reQueue': reQueue }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            console.log('Verify score conflict, retrying', result);
            setTimeout(() => {
                setPlayerRequeue({
                    interaction,
                    matchNumber,
                    reQueue,
                });
            }, 1000);
            return;
        }

        resolve(true);
    });
};
