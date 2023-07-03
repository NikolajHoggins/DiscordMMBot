import { Command } from './Command';
import { Abandon } from './commands/Abandon';
import { Bans } from './commands/Bans';
import { Based } from './commands/Based';
import { Countdown } from './commands/Countdown';
import { DeleteGame } from './commands/DeleteGame';
import { EndGame } from './commands/EndGame';
import { ForceAbandon } from './commands/ForceAbandon';
import { ForceStart } from './commands/ForceStart';
import { ForceSubmit } from './commands/ForceSubmit';
import { ForceVerify } from './commands/ForceVerify';
import { Graph } from './commands/Graph';
import { PingPlayers } from './commands/PingPlayers';
import { PlayingCommand } from './commands/Playing.js';
import { QueueCommand } from './commands/Queue';
import { RatingChange } from './commands/RatingChange';
import { Ready } from './commands/Ready';
import { RestartBot } from './commands/Restart';
import { Stats } from './commands/Stats';
import { SubmitScore } from './commands/SubmitScore';
import { Timeout } from './commands/Timeout';
import { Top } from './commands/Top';
import { Unready } from './commands/Unready';
export const Commands: Command[] = [
    Based,
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
    //mod commands
    EndGame,
    RestartBot,
    Timeout,
    ForceSubmit,
    ForceStart,
    ForceAbandon,
    Bans,
    Countdown,
    DeleteGame,
    ForceVerify,
];
