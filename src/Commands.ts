import { Command } from './Command';
import { Based } from './commands/Based';
import { EndGame } from './commands/EndGame';
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
    EndGame,
    PingPlayers,
    SubmitScore,
    RestartBot,
    RatingChange,
    Timeout,
];
