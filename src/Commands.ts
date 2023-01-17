import { Command } from './Command';
import { Based } from './commands/Based';
import { EndGame } from './commands/EndGame';
import { QueueCommand } from './commands/Queue';
import { Ready } from './commands/Ready';
import { Stats } from './commands/Stats';
import { Top } from './commands/Top';
import { Unready } from './commands/Unready';
export const Commands: Command[] = [Based, Stats, Ready, Top, QueueCommand, Unready, EndGame];
