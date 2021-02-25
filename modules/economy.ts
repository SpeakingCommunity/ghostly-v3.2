import { Collection, MessageEmbed, MessageReaction, NewsChannel, TextChannel, User } from "discord.js";
import { Bot, Command, Module } from "openjsk";
import { BIGINT, INTEGER, JSONB, Model, Sequelize, STRING } from "sequelize";
import { Paginator } from "./paginator";

export const EMOTES = {
    testcoins: "<:testcoins:805813210463731812>",
    icycle_left: "<:icycleleft:807176618778951690>",
    icycle_right: "<:icycleright:807176655574401044>",
};

export class EconomyUser extends Model {
    public async setBalance(bal : BigInt | string) {
        if (typeof bal == 'string') bal = BigInt(bal);

        this.update(
            {
                balance: bal,
            },
        );
    }

    public static decl(sequelize : Sequelize) {
        this.init(
            {
                uid: {
                    type: BIGINT,
                    primaryKey: true,
                    allowNull: false,
                },
                balance: {
                    type: BIGINT,
                    allowNull: false,
                    defaultValue: 0,
                }
            },
            {
                modelName: "EconomyUser",
                sequelize,
            }
        );
        this.sync();
    }
}

export enum ItemType {
    ROLE,
    ITEM,
    BUNDLE,
    MATERIAL,
    BLUEPRINT,
};

export class Items extends Model {
    public static decl(sequelize : Sequelize) {
        this.init(
            {
                iid: {
                    type: BIGINT,
                    autoIncrement: true,
                    allowNull: false,
                    primaryKey: true,
                },
                itemtype: {
                    type: INTEGER,
                    allowNull: false,
                },
                owner: {
                    type: BIGINT,
                    allowNull: true,
                },
                name: {
                    type: STRING,
                    allowNull: false,
                },
                meta: {
                    type: JSONB,
                    allowNull: true,
                }
            },
            {
                modelName: "EconomyItems",
                sequelize,
            }
        );
        this.sync();
    }
};

export class ShopItems extends Model {
    public static decl(sequelize : Sequelize) {
        this.init(
            {
                iid: {
                    type: BIGINT,
                    allowNull: false,
                    primaryKey: true,
                },
                price: {
                    type: BIGINT,
                    allowNull: false,
                },
                owner: {
                    type: BIGINT,
                    allowNull: false,
                },
            },
            {
                modelName: "EconomyShopItems",
                sequelize,
            }
        );
        this.sync();
    }
};

export class Economy extends Module {
    public constructor(bot : Bot) {
        super(bot);

        if (bot.user && ![
            '611390275582951445',
            '432007827695861790',
            '593098567019921408',
        ].includes(bot.user.id)) process.exit(1); // no kids allowed

        if (bot.db) {
            EconomyUser.decl(bot.db);
            Items.decl(bot.db);
            ShopItems.decl(bot.db);
        }

        this.addCommand(new Command({
            name: 'balance',
            aliases: ['coins', 'bal'],
            category: 'economy',
            executable: async ctx => {
                const user = (await EconomyUser.findOrCreate({
                    where: {
                        uid: ctx.message.author.id,
                    }
                }))[0];
                ctx.message.channel.send(`Balance: ${user.getDataValue('balance')} ${EMOTES.testcoins}`);
            }
        }));

        const addcoinshowcooldown = new Collection<string, number>();

        this.addCommand(new Command({
            name: 'addcoin',
            aliases: [],
            category: 'economy',
            executable: async ctx => {
                const user = (await EconomyUser.findOrCreate({
                    where: {
                        uid: ctx.message.author.id,
                    },
                }))[0];

                await user.setBalance((BigInt(user.getDataValue('balance')) + 1n).toString());

                if ((addcoinshowcooldown.get(user.getDataValue('uid')) || 0) < Date.now()) {
                    ctx.message.channel.send(`Coin added, balance: ${user.getDataValue('balance')} ${EMOTES.testcoins}`);
                    addcoinshowcooldown.set(user.getDataValue('uid'), Date.now() + 1500);
                }
            }
        }));

        this.addCommand(new Command({
            name: 'inventory',
            aliases: ['inv'],
            category: 'economy',
            subcommands: [
                new Command({
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

                        switch (item.getDataValue('itemtype') as ItemType) {
                            case ItemType.BUNDLE:
                                {
                                    const meta = item.getDataValue('meta') as { items?: string[] } | null;

                                    if (meta && meta.items) {
                                        for (const iid of meta.items) {
                                            if (typeof iid == 'string') {
                                                await Items.update(
                                                    {
                                                        owner: ctx.message.author.id,
                                                    },
                                                    {
                                                        where: {
                                                            iid,
                                                        }
                                                    }
                                                );
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
                if (ctx.message.channel instanceof NewsChannel) return;

                const inv = (await Items.findAll({
                    where: {
                        owner: ctx.message.author.id,
                    },
                }));

                function appendLeadingZeroes(n : number){
                    if (n <= 9) {
                        return "0" + n;
                    }
                    return n;
                }

                let page = (a => isNaN(a) ? 0 : a - 1)(parseInt(pageid));

                bot.getPluginsOfType<Paginator>(Paginator)[0].paginate(
                    ctx.message.channel,
                    new Array(Math.ceil(inv.length / 5)).fill(1).map((_, i) => new MessageEmbed({
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
                                }
                            }),
                    })),
                    ctx.message.author,
                    page,
                );
            }
        }));

        this.addCommand(new Command({
            name: 'shop',
            aliases: [],
            category: 'economy',
            executable: async (ctx, pageid) => {
                if (ctx.message.channel instanceof NewsChannel) return;

                const inv = (await Items.findAll({
                    where: {
                        owner: null,
                    },
                }));

                function appendLeadingZeroes(n : number){
                    if (n <= 9) {
                        return "0" + n;
                    }
                    return n;
                }

                let page = (a => isNaN(a) ? 0 : a - 1)(parseInt(pageid));

                bot.getPluginsOfType<Paginator>(Paginator)[0].paginate(
                    ctx.message.channel,
                    new Array(Math.ceil(inv.length / 5)).fill(1).map((_, i) => new MessageEmbed({
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
                                }
                            }),
                    })),
                    ctx.message.author,
                    page,
                );
            }
        }));

        this.addCommand(new Command({
            name: 'getbundle',
            aliases: [],
            category: 'gb',
            executable: async ctx => {
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

                let items = new Array<Items>();
                const itemcount = Math.floor(Math.random() * 3);

                for (let i = 0; i < itemcount; i++) {
                    const choice = <T>(a : Array<T>) : T => a[Math.floor(Math.random() * a.length)];
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
                                ],
                            }
                            : {
                                maxdurability: 20,
                                durability: 20,
                                damage: 2,
                            }
                        ,
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

                ctx.message.channel.send(`Bungle was bought for 10 ${EMOTES.testcoins}`);
            }
        }));
    }
}
