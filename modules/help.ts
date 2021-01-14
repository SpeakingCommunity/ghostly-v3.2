import { ClientUser, EmbedFieldData, MessageEmbed, Team, User, version } from "discord.js";
import { Bot, Command, CommandPermissionsLevel, Module } from "openjsk";
import { platform, release } from "os";

export class Help extends Module { // this module probably will be added to the next release of openjsk
    constructor(bot : Bot) {
        super(bot);

        this.name = "help-mod";

        this.addCommand(new Command({
            name: 'commands',
            aliases: ['help'],
            category: 'main',
            permissions: {
                level: CommandPermissionsLevel.DM,
            },
            executable: async (ctx, nameOfSmthOrPage : string | undefined, page : string | undefined) => {
                const mods = bot.getPluginsOfType<Module>(Module);
                let commands = mods.map(a => a.commands).flat();

                let actualPage = (
                    a => isNaN(a) ? 1 : a
                )(
                    parseInt(nameOfSmthOrPage && !isNaN(parseInt(nameOfSmthOrPage)) ? nameOfSmthOrPage : page || '1')
                ) - 1;

                if (nameOfSmthOrPage && isNaN(parseInt(nameOfSmthOrPage))) {
                    commands = commands.filter(
                        a =>
                        a.category == nameOfSmthOrPage ||
                        a.name.includes(nameOfSmthOrPage) ||
                        a.aliases.filter(b => b.includes(nameOfSmthOrPage)).length > 0
                    );
                }

                const pages = Math.ceil(commands.length / 5);

                if (pages == 0) {
                    ctx.message.channel.send("Found 0 commands from search query");
                    return;
                }

                while (actualPage < 0) actualPage += pages;
                while (actualPage > pages) actualPage -= pages;

                function generateMessage() {
                    return new MessageEmbed({
                        title: "Commands list",
                        description: "List of commands. Maybe useful",
                        fields: commands
                            .slice(actualPage * 5, actualPage * 5 + 5)
                            .map(a => {
                                const value = new Array<string>();

                                value.push(`> No description`.replace(/\n/g, "\n> "));
                                value.push(``);
                                if (a.aliases.length > 0) value.push(`**Aliases**: ${a.aliases.join(', ')}`);
                                if (a.category) value.push(`**Category**: ${a.category}`);

                                return {
                                    name: a.name,
                                    value: value.join('\n'),
                                    inline: true,
                                }
                            }),
                    });
                }

                ctx.message.channel.send(generateMessage());
            }
        }));

        this.addCommand(new Command({
            name: 'ping',
            category: 'main',
            permissions: {
                level: CommandPermissionsLevel.DM,
            },
            executable: async (ctx) => {
                ctx.message.channel.send(new MessageEmbed({
                    title: "Bot ping",
                    description: `:ping_pong: **Ping**: ${ctx.message.client.ws.ping}ms`,
                }));
            }
        }));

        this.addCommand(new Command({
            name: 'info',
            category: 'main',
            permissions: {
                level: CommandPermissionsLevel.DM,
            },
            executable: async (ctx) => {
                const user = ctx.message.client.user as ClientUser;

                if (!user.bot) { //why?
                    ctx.message.channel.send("this client is a selfbot. why?");
                    return;
                }

                const app = await ctx.message.client.fetchApplication();

                ctx.message.channel.send(new MessageEmbed({
                    title: app.name,
                    description: app.description,
                    author: {
                        name: user.username,
                        iconURL: user.avatarURL({ size: 1024, format: 'webp', dynamic: true })
                            || 'https://discordapp.com/assets/dd4dbc0016779df1378e7812eabaa04d.png',
                    },
                    thumbnail: {
                        url: app.iconURL({
                            format: 'webp',
                            size: 4096,
                        })
                    },
                    fields: [
                        {
                            name: "Owner",
                            value: app.owner instanceof User
                                ? `👑 <@${app.owner.id}>`
                                : (
                                    app.owner instanceof Team
                                    ? `👥 **${app.owner.name}**\n` +
                                    app.owner.members.map(
                                        (a, id) => `${
                                            (app.owner as Team).ownerID == id
                                            ? '👑'
                                            : '🔧'
                                        } <@${a.id}>`
                                    ).join('\n')
                                    : `No owner`
                                ),
                            inline: true,
                        },
                        {
                            name: "Information",
                            value: [
                                `Host: ${platform()} ${release()}`,
                                `Node.js: ${process.version}`,
                                `Discord.js: ${version}`,
                                `OpenJSK: yes`,
                            ].join('\n'),
                            inline: true,
                        },
                        ...(() => {
                            const fields = new Array<EmbedFieldData>();

                            if (!app.botPublic) fields.push({
                                name: "🔒 Private bot",
                                value: "This bot is private and can only be added by its developer",
                            });

                            if (app.botRequireCodeGrant) fields.push({
                                name: "📜 Bot requires code grant",
                                value: [
                                    "While adding this bot to your server you will be",
                                    "redirected to an external website provided by bot",
                                    "developer"
                                ].join(' '),
                            });

                            if (app.botPublic) {
                                if (!app.botRequireCodeGrant) {
                                    fields.push({
                                        name: "➕ Add bot to your server",
                                        value: [
                                            `[https://discord.com/api/oauth2/authorize?client_id=${app.id}&permissions=0&scope=bot](Without permissions)`,
                                            `[https://discord.com/api/oauth2/authorize?client_id=${app.id}&permissions=8&scope=bot](Admin permissions)`,
                                            `[https://discord.com/api/oauth2/authorize?client_id=${app.id}&permissions=-1&scope=bot](Custom setup)`,
                                        ].join('\n'),
                                    });
                                }
                                else {
                                    fields.push({
                                        name: "➕ Add bot to your server",
                                        value: "**Ask developer for a link**",
                                    });
                                }
                            }

                            return fields;
                        })(),
                    ],
                }));
            }
        }));

        // TODO: Add prefix command when it will be possible
        // TODO: Add language command when it will be possible
    }
}
