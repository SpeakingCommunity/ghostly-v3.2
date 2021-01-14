import { Bot, Module, plugins } from 'openjsk';
import { Options, Sequelize } from 'sequelize';
import * as config from './.config.json';
import { Help } from './modules/help';

const bot = new Bot({
    prefix: config.prefix,
});

bot.db = new Sequelize(config.database as Options);

bot.loadPlugin(new plugins.DefaultPrefixManager(bot));
bot.loadPlugin(new plugins.DefaultHandler(bot));

bot.loadPlugin(new Help(bot));

bot.login(config.token);
