import { Collection } from "discord.js";
import { Bot, Command, Module } from "openjsk";
import { BIGINT, Model, Sequelize } from "sequelize";

export const EMOTES = {
    testcoins: "<:testcoins:805813210463731812>",
}

export class User extends Model {
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

export class Economy extends Module {
    public constructor(bot : Bot) {
        super(bot);

        if (bot.db) {
            User.decl(bot.db);
        }

        this.addCommand(new Command({
            name: 'balance',
            aliases: ['coins', 'bal'],
            category: 'economy',
            executable: async ctx => {
                const user = (await User.findOrCreate({
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
                const user = (await User.findOrCreate({
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
    }
}
