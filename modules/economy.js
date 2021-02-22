"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Economy = exports.ShopItems = exports.Items = exports.ItemType = exports.EconomyUser = exports.EMOTES = void 0;
const discord_js_1 = require("discord.js");
const openjsk_1 = require("openjsk");
const sequelize_1 = require("sequelize");
const paginator_1 = require("./paginator");
exports.EMOTES = {
    testcoins: "<:testcoins:805813210463731812>",
    icycle_left: "<:icycleleft:807176618778951690>",
    icycle_right: "<:icycleright:807176655574401044>",
};
class EconomyUser extends sequelize_1.Model {
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
exports.EconomyUser = EconomyUser;
var ItemType;
(function (ItemType) {
    ItemType[ItemType["ROLE"] = 0] = "ROLE";
    ItemType[ItemType["ITEM"] = 1] = "ITEM";
    ItemType[ItemType["BUNDLE"] = 2] = "BUNDLE";
    ItemType[ItemType["MATERIAL"] = 3] = "MATERIAL";
    ItemType[ItemType["BLUEPRINT"] = 4] = "BLUEPRINT";
})(ItemType = exports.ItemType || (exports.ItemType = {}));
;
class Items extends sequelize_1.Model {
    static decl(sequelize) {
        this.init({
            iid: {
                type: sequelize_1.BIGINT,
                autoIncrement: true,
                allowNull: false,
                primaryKey: true,
            },
            itemtype: {
                type: sequelize_1.INTEGER,
                allowNull: false,
            },
            owner: {
                type: sequelize_1.BIGINT,
                allowNull: true,
            },
            name: {
                type: sequelize_1.STRING,
                allowNull: false,
            },
            meta: {
                type: sequelize_1.JSONB,
                allowNull: true,
            }
        }, {
            modelName: "EconomyItems",
            sequelize,
        });
        this.sync();
    }
}
exports.Items = Items;
;
class ShopItems extends sequelize_1.Model {
    static decl(sequelize) {
        this.init({
            iid: {
                type: sequelize_1.BIGINT,
                allowNull: false,
                primaryKey: true,
            },
            price: {
                type: sequelize_1.BIGINT,
                allowNull: false,
            },
            owner: {
                type: sequelize_1.BIGINT,
                allowNull: false,
            },
        }, {
            modelName: "EconomyShopItems",
            sequelize,
        });
        this.sync();
    }
}
exports.ShopItems = ShopItems;
;
class Economy extends openjsk_1.Module {
    constructor(bot) {
        super(bot);
        if (bot.user && ![
            '611390275582951445',
            '432007827695861790',
            '593098567019921408',
        ].includes(bot.user.id))
            process.exit(1); // no kids allowed
        if (bot.db) {
            EconomyUser.decl(bot.db);
            Items.decl(bot.db);
            ShopItems.decl(bot.db);
        }
        this.addCommand(new openjsk_1.Command({
            name: 'balance',
            aliases: ['coins', 'bal'],
            category: 'economy',
            executable: async (ctx) => {
                const user = (await EconomyUser.findOrCreate({
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
                const user = (await EconomyUser.findOrCreate({
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
        this.addCommand(new openjsk_1.Command({
            name: 'inventory',
            aliases: ['inv'],
            category: 'economy',
            subcommands: [
                new openjsk_1.Command({
                    name: 'use',
                    executable: async (ctx, itemid) => {
                        if (itemid === undefined) {
                            ctx.message.channel.send(`'itemid' argument required`);
                            return;
                        }
                        const item = await Items.findOne({
                            where: {
                                iid: itemid,
                            }
                        });
                        if (!item) {
                            ctx.message.channel.send(`Unknown item`);
                            return;
                        }
                        switch (item.getDataValue('itemtype')) {
                            case ItemType.BUNDLE:
                                {
                                    const meta = item.getDataValue('meta');
                                    if (meta && meta.items) {
                                        for (const iid of meta.items) {
                                            if (typeof iid == 'string') {
                                                await Items.update({
                                                    owner: ctx.message.author.id,
                                                }, {
                                                    where: {
                                                        iid,
                                                    }
                                                });
                                            }
                                        }
                                    }
                                    await item.destroy({
                                        force: true,
                                    });
                                    ctx.message.channel.send(`Bundle has been opened`);
                                }
                                break;
                            default:
                                ctx.message.channel.send(`Cannot use this item`);
                                break;
                        }
                    },
                }),
            ],
            executable: async (ctx, pageid) => {
                if (ctx.message.channel instanceof discord_js_1.NewsChannel)
                    return;
                const inv = (await Items.findAll({
                    where: {
                        owner: ctx.message.author.id,
                    },
                }));
                function appendLeadingZeroes(n) {
                    if (n <= 9) {
                        return "0" + n;
                    }
                    return n;
                }
                let page = (a => isNaN(a) ? 0 : a - 1)(parseInt(pageid));
                bot.getPluginsOfType(paginator_1.Paginator)[0].paginate(ctx.message.channel, new Array(Math.ceil(inv.length / 5)).fill(1).map((_, i) => new discord_js_1.MessageEmbed({
                    title: "Inventory",
                    description: "Items list",
                    fields: inv
                        .slice(i * 5, i * 5 + 5)
                        .map(a => {
                        const current_datetime = a.getDataValue('createdAt');
                        return {
                            name: `${a.getDataValue('iid')} ) ${a.getDataValue('name')}`,
                            value: `Exists in economy since ${current_datetime.getFullYear() + "-" + appendLeadingZeroes(current_datetime.getMonth() + 1) + "-" + appendLeadingZeroes(current_datetime.getDate()) + " " + appendLeadingZeroes(current_datetime.getHours()) + ":" + appendLeadingZeroes(current_datetime.getMinutes()) + ":" + appendLeadingZeroes(current_datetime.getSeconds())}`,
                            inline: true,
                        };
                    }),
                })), ctx.message.author, page);
            }
        }));
        this.addCommand(new openjsk_1.Command({
            name: 'shop',
            aliases: [],
            category: 'economy',
            executable: async (ctx, pageid) => {
                if (ctx.message.channel instanceof discord_js_1.NewsChannel)
                    return;
                const inv = (await Items.findAll({
                    where: {
                        owner: null,
                    },
                }));
                function appendLeadingZeroes(n) {
                    if (n <= 9) {
                        return "0" + n;
                    }
                    return n;
                }
                let page = (a => isNaN(a) ? 0 : a - 1)(parseInt(pageid));
                bot.getPluginsOfType(paginator_1.Paginator)[0].paginate(ctx.message.channel, new Array(Math.ceil(inv.length / 5)).fill(1).map((_, i) => new discord_js_1.MessageEmbed({
                    title: "Inventory",
                    description: "Items list",
                    fields: inv
                        .slice(i * 5, i * 5 + 5)
                        .map(a => {
                        const current_datetime = a.getDataValue('createdAt');
                        return {
                            name: `${a.getDataValue('iid')} ) ${a.getDataValue('name')}`,
                            value: `Exists in economy since ${current_datetime.getFullYear() + "-" + appendLeadingZeroes(current_datetime.getMonth() + 1) + "-" + appendLeadingZeroes(current_datetime.getDate()) + " " + appendLeadingZeroes(current_datetime.getHours()) + ":" + appendLeadingZeroes(current_datetime.getMinutes()) + ":" + appendLeadingZeroes(current_datetime.getSeconds())}`,
                            inline: true,
                        };
                    }),
                })), ctx.message.author, page);
            }
        }));
        this.addCommand(new openjsk_1.Command({
            name: 'getbundle',
            aliases: [],
            category: 'gb',
            executable: async (ctx) => {
                const user = (await EconomyUser.findOrCreate({
                    where: {
                        uid: ctx.message.author.id,
                    },
                }))[0];
                const balance = BigInt(user.getDataValue('balance'));
                if (balance >= 10n) {
                    await user.setBalance(balance - 10n);
                }
                else {
                    await ctx.message.channel.send(`Bundle costs 10 coins, you have ${balance}`);
                    return;
                }
                let items = new Array();
                const itemcount = Math.floor(Math.random() * 3);
                for (let i = 0; i < itemcount; i++) {
                    const choice = (a) => a[Math.floor(Math.random() * a.length)];
                    const type = choice([
                        ItemType.MATERIAL,
                        ItemType.ITEM,
                    ]);
                    const bundledItem = (await Items.create({
                        itemtype: type,
                        owner: null,
                        name: type == ItemType.MATERIAL ? 'Test Material' : 'Test Item',
                        meta: type == ItemType.MATERIAL
                            ? {
                                cost: 5,
                                maxdurability: 150,
                                durability: 150,
                                damage: 1,
                                tags: [
                                    "solid",
                                    "stone",
                                    "log",
                                ]
                            }
                            : {
                                maxdurability: 20,
                                durability: 20,
                                damage: 2,
                            },
                    }));
                    items[i] = bundledItem;
                }
                await Items.create({
                    itemtype: ItemType.BUNDLE,
                    owner: ctx.message.author.id,
                    name: "A Bundle",
                    meta: {
                        items: items.map(a => a.getDataValue('iid')),
                    }
                });
                ctx.message.channel.send(`Bungle was bought for 10 ${exports.EMOTES.testcoins}`);
            }
        }));
    }
}
exports.Economy = Economy;
