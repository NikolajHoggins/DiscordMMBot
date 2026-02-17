import { Command } from './Command';
import { Abandon } from './commands/Abandon';
import { CodeCommand } from './commands/Code';
import { AddNote } from './commands/mod/AddNote';
import { Bans } from './commands/mod/Bans';
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
import { RestartBot } from './commands/mod/Restart';
import { Stats } from './commands/Stats';
import { SubmitScore } from './commands/SubmitScore';
import { Timeout } from './commands/mod/Timeout';
import { Top } from './commands/Top';
import { Unready } from './commands/Unready';
import { Untimeout } from './commands/mod/Untimeout';
import { GetMatchInfo } from './commands/mod/GetMatchInfo';
import { FetchAvatars } from './commands/admin/FetchAvatars';
import { RankCurve } from './commands/admin/RankCurve';
import { SetConfig } from './commands/admin/SetConfig';
import { EnableDuels } from './commands/mod/EnableDuels';
import { RunEloDecay } from './commands/admin/RunEloDecay';
import { RefreshRankRoles } from './commands/admin/RefreshRankRoles';
import { TestMVP } from './commands/mod/TestMVP';
import { SendDM } from './commands/admin/DM';
import { PostAimHero } from './commands/admin/PostAimHero';
import { ResendReady } from './commands/mod/ResendReady';
import { StartGame } from './commands/mod/StartGame';

export const Commands: Command[] = [
    Stats,
    Top,
    QueueCommand,
    Unready,
    PingPlayers,
    SubmitScore,
    CodeCommand,
    Abandon,
    RatingChange,
    Graph,
    PlayingCommand,
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
    EnableDuels,
    TestMVP,
    ResendReady,
    StartGame,
    //Admin commands
    RankCurve,
    FetchAvatars,
    SetConfig,
    RunEloDecay,
    RefreshRankRoles,
    SendDM,
    PostAimHero,
];
