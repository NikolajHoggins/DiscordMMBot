import { Command } from './Command';
import { Abandon } from './commands/Abandon.js';
import { Based } from './commands/Based';
import { EndGame } from './commands/EndGame';
import { ForceStart } from './commands/ForceStart.js';
import { ForceSubmit } from './commands/ForceSubmit.js';
import { PingPlayers } from './commands/PingPlayers';
import { QueueCommand } from './commands/Queue';
import { RatingChange } from './commands/RatingChange.js';
import { Ready } from './commands/Ready';
import { RestartBot } from './commands/Restart.js';
import { Stats } from './commands/Stats';
import { SubmitScore } from './commands/SubmitScore';
import { Timeout } from './commands/Timeout.js';
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
    //mod commands
    EndGame,
    RestartBot,
    Timeout,
    ForceSubmit,
    ForceStart,
];
