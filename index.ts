import { Bot, Module, plugins } from 'openjsk';
import { Options, Sequelize } from 'sequelize';
import * as config from './.config.json';
import { Economy } from './modules/economy';
import { FightHub } from './modules/fighthub';
import { Help } from './modules/help';
import { Paginator } from './modules/paginator';

const bot = new Bot({
    prefix: config.prefix,
    restTimeOffset: 0,
    partials: [
        "REACTION",
        "USER",
        "MESSAGE",
    ]
});

bot.db = new Sequelize(config.database as Options);

bot.loadPlugin(new plugins.DefaultPrefixManager(bot));
bot.loadPlugin(new plugins.DefaultHandler(bot));

bot.loadPlugin(new Help(bot));
bot.loadPlugin(new Economy(bot));
bot.loadPlugin(new Paginator(bot));
bot.loadPlugin(new FightHub(bot));

bot.login(config.token);
