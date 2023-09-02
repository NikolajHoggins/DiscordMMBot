import { Command } from './Command';
import { Abandon } from './commands/Abandon';
import { AddNote } from './commands/mod/AddNote';
import { Bans } from './commands/Bans';
import { Countdown } from './commands/Countdown';
import { DeleteGame } from './commands/DeleteGame';
import { EndGame } from './commands/EndGame';
import { ForceAbandon } from './commands/mod/ForceAbandon';
import { ForceReady } from './commands/mod/ForceReady';
import { ForceStart } from './commands/mod/ForceStart';
import { ForceSubmit } from './commands/mod/ForceSubmit';
import { ForceVerify } from './commands/mod/ForceVerify';
import { GiveElo } from './commands/mod/GiveElo';
import { Graph } from './commands/Graph';
import { Notes } from './commands/Notes';
import { PingMods } from './commands/PingMods';
import { PingPlayers } from './commands/PingPlayers';
import { PlayingCommand } from './commands/Playing';
import { QueueCommand } from './commands/Queue';
import { RatingChange } from './commands/RatingChange';
import { Ready } from './commands/Ready';
import { RestartBot } from './commands/Restart';
import { Stats } from './commands/Stats';
import { SubmitScore } from './commands/SubmitScore';
import { Timeout } from './commands/Timeout';
import { Top } from './commands/Top';
import { Unready } from './commands/Unready';
import { Untimeout } from './commands/Untimeout';
import { GetMatchInfo } from './commands/mod/GetMatchInfo';

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
    ForceStart,
    ForceAbandon,
    Bans,
    Notes,
    DeleteGame,
    ForceVerify,
    GiveElo,
    ForceReady,
    GetMatchInfo,
];
