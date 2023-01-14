import { Command } from './Command';
import { Based } from './commands/Based';
import { Hello } from './commands/Hello';
import { QueueCommand } from './commands/Queue';
import { Ready } from './commands/Ready';
import { Sex } from './commands/Sex';
import { Stats } from './commands/Stats';
import { Top } from './commands/Top';
export const Commands: Command[] = [Hello, Based, Stats, Ready, Top, QueueCommand, Sex];
