"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv = __importStar(require("dotenv"));
const updateQueue_1 = __importDefault(require("./crons/updateQueue"));
const interactionCreate_1 = __importDefault(require("./listeners/interactionCreate"));
const reaction_1 = __importDefault(require("./listeners/reaction"));
const ready_1 = __importDefault(require("./listeners/ready"));
const database_service_1 = require("./services/database.service");
const guildMemberAdd_js_1 = __importDefault(require("./listeners/guildMemberAdd.js"));
const tryStart_js_1 = __importDefault(require("./crons/tryStart.js"));
console.log('Bot is starting...');
dotenv.config();
if (!process.env.BOT_TOKEN)
    throw new Error('No bot token');
const client = new discord_js_1.Client({
    intents: [discord_js_1.IntentsBitField.Flags.GuildMessageReactions, discord_js_1.IntentsBitField.Flags.GuildMembers],
});
(0, ready_1.default)(client);
(0, reaction_1.default)(client);
(0, interactionCreate_1.default)(client);
(0, guildMemberAdd_js_1.default)(client);
(0, database_service_1.connectToDatabase)();
client.login(process.env.BOT_TOKEN);
//Register cronjobs
(0, updateQueue_1.default)(client);
(0, tryStart_js_1.default)(client);
