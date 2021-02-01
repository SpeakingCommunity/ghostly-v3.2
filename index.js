"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
Object.defineProperty(exports, "__esModule", { value: true });
const openjsk_1 = require("openjsk");
const sequelize_1 = require("sequelize");
const config = __importStar(require("./.config.json"));
const economy_1 = require("./modules/economy");
const help_1 = require("./modules/help");
const bot = new openjsk_1.Bot({
    prefix: config.prefix,
});
bot.db = new sequelize_1.Sequelize(config.database);
bot.loadPlugin(new openjsk_1.plugins.DefaultPrefixManager(bot));
bot.loadPlugin(new openjsk_1.plugins.DefaultHandler(bot));
bot.loadPlugin(new help_1.Help(bot));
bot.loadPlugin(new economy_1.Economy(bot));
bot.login(config.token);
