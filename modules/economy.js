"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Economy = exports.User = exports.EMOTES = void 0;
const discord_js_1 = require("discord.js");
const openjsk_1 = require("openjsk");
const sequelize_1 = require("sequelize");
exports.EMOTES = {
    testcoins: "<:testcoins:805813210463731812>",
};
class User extends sequelize_1.Model {
    async setBalance(bal) {
        if (typeof bal == 'string')
            bal = BigInt(bal);
        this.update({
            balance: bal,
        });
    }
    static decl(sequelize) {
        this.init({
            uid: {
                type: sequelize_1.BIGINT,
                primaryKey: true,
                allowNull: false,
            },
            balance: {
                type: sequelize_1.BIGINT,
                allowNull: false,
                defaultValue: 0,
            }
        }, {
            modelName: "EconomyUser",
            sequelize,
        });
        this.sync();
    }
}
exports.User = User;
class Economy extends openjsk_1.Module {
    constructor(bot) {
        super(bot);
        if (bot.db) {
            User.decl(bot.db);
        }
        this.addCommand(new openjsk_1.Command({
            name: 'balance',
            aliases: ['coins', 'bal'],
            category: 'economy',
            executable: async (ctx) => {
                const user = (await User.findOrCreate({
                    where: {
                        uid: ctx.message.author.id,
                    }
                }))[0];
                ctx.message.channel.send(`Balance: ${user.getDataValue('balance')} ${exports.EMOTES.testcoins}`);
            }
        }));
        const addcoinshowcooldown = new discord_js_1.Collection();
        this.addCommand(new openjsk_1.Command({
            name: 'addcoin',
            aliases: [],
            category: 'economy',
            executable: async (ctx) => {
                const user = (await User.findOrCreate({
                    where: {
                        uid: ctx.message.author.id,
                    },
                }))[0];
                await user.setBalance((BigInt(user.getDataValue('balance')) + 1n).toString());
                if ((addcoinshowcooldown.get(user.getDataValue('uid')) || 0) < Date.now()) {
                    ctx.message.channel.send(`Coin added, balance: ${user.getDataValue('balance')} ${exports.EMOTES.testcoins}`);
                    addcoinshowcooldown.set(user.getDataValue('uid'), Date.now() + 1500);
                }
            }
        }));
    }
}
exports.Economy = Economy;
