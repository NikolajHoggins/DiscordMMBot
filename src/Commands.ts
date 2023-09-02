import { Command } from './Command';
import { Abandon } from './commands/Abandon';
import { AddNote } from './commands/mod/AddNote';
import { Bans } from './commands/mod/Bans';
import { Countdown } from './commands/Countdown';
import { EndGame } from './commands/mod/EndGame';
import { ForceAbandon } from './commands/mod/ForceAbandon';
import { ForceReady } from './commands/mod/ForceReady';
import { ForceSubmit } from './commands/mod/ForceSubmit';
import { ForceVerify } from './commands/mod/ForceVerify';
import { GiveElo } from './commands/mod/GiveElo';
import { Graph } from './commands/Graph';
import { Notes } from './commands/mod/Notes';
import { PingMods } from './commands/PingMods';
import { PingPlayers } from './commands/PingPlayers';
import { PlayingCommand } from './commands/Playing';
import { QueueCommand } from './commands/Queue';
import { RatingChange } from './commands/RatingChange';
import { Ready } from './commands/Ready';
import { RestartBot } from './commands/mod/Restart';
import { Stats } from './commands/Stats';
import { SubmitScore } from './commands/SubmitScore';
import { Timeout } from './commands/mod/Timeout';
import { Top } from './commands/Top';
import { Unready } from './commands/Unready';
import { Untimeout } from './commands/mod/Untimeout';
import { GetMatchInfo } from './commands/mod/GetMatchInfo';
import { FetchAvatars } from './commands/admin/FetchAvatars';

export const Commands: Command[] = [
    Stats,
    Ready,
    Top,
    QueueCommand,
    Unready,
    PingPlayers,
    SubmitScore,
    Abandon,
    RatingChange,
    Graph,
    PlayingCommand,
    Countdown,
    PingMods,
    //mod commands
    EndGame,
    AddNote,
    RestartBot,
    Timeout,
    Untimeout,
    ForceSubmit,
    ForceAbandon,
    Bans,
    Notes,
    ForceVerify,
    GiveElo,
    ForceReady,
    GetMatchInfo,
    //Admin commands
    FetchAvatars,
];
