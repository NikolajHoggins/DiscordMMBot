import { Command } from './Command';
import { Based } from './commands/Based';
import { Hello } from './commands/Hello';
import { Ready } from './commands/Ready';
import { Stats } from './commands/Stats';

export const Commands: Command[] = [Hello, Based, Stats, Ready];
