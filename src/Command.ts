import { Role, MessageEmbed } from 'discord.js';
import { Message } from './Message';
import { Argument, ArgumentType } from './Argument';
import { CommandOptions } from './CommandOptions';
import { rightPad } from './_helpers';

export abstract class Command {
    name: string;
    aliases: string[] = [];
    description: string;
    usage: string;
    args: Argument[] = [];
    requiredRole: Role;
    constructor(options: CommandOptions) {
        this.name = options.name;
        this.aliases = options.aliases ? options.aliases : this.aliases;
        this.args = options.args ? options.args : this.args;
        this.description = options.description;
        this.usage = options.usage;
    }
    /**
     * Extracts a commands arguments from a message
     * @param message Message that invoked the command
     * @returns Map of the found arguments
     */
    async parseArgs(message: Message): Promise<Map<string, Argument>> {
        let userArgs = message.content.split(' ').splice(1);
        var argMap = new Map<string, Argument>();
        if (this.args.length === 0 && userArgs.length > 0) {
            throw new Error(`\`${this.name}\` does not have any arguments`);
        }
        for (let i = 0; i < this.args.length; i++) {
            let arg = this.args[i];
            if (i >= userArgs.length && arg.required) {
                throw new Error(`${arg.name} is missing. use \`${message.client.prefix}${this.name}?\``);
            }
            else if (i >= userArgs.length) { break; }
            let userArg;
            //if the final arg is being parsed and it's a string, combine userArgs
            if (i === this.args.length - 1 && arg.type === ArgumentType.String) {
                userArg = userArgs.slice(i).join(' ');
            } else {
                userArg = userArgs[i]
                //if the current arg has a quote, find the end quote
                if(userArg.includes('"') && userArg.split('"').length === 2) {
                    for(let k = i + 1; k < userArgs.length; k++) {
                        if(userArgs[k].includes('"')) {
                            userArg = userArgs.slice(i, k + 1).join(' ');
                            userArgs = [...userArgs.slice(0, i), userArg, ...userArgs.slice(k+1)];
                            break;
                        }
                    }
                }
            }
            userArg = userArg.replace('"', '');
            userArg = userArg.replace('\"', '');
            try {
                if (arg.required) {
                    argMap.set(arg.name, await arg.parseArg(userArg, message));
                } else {
                    let value = await arg.parseArg(userArg, message);
                    if (value !== undefined) {
                        argMap.set(arg.name, value);
                    }
                }
            } catch (e) {
                throw e;
            }
        }
        return argMap;
    }

    help(msg: Message): MessageEmbed {
        var embed = new MessageEmbed();
        let aliasStr = '';
        for (var i = 0; i < this.aliases.length; i++) {
            aliasStr += this.aliases[i];
            if (i !== this.aliases.length - 1) {
                aliasStr += ' | ';
            }
        }
        let titleStr = `${this.name} ${aliasStr.length !== 0 ? `(${aliasStr})` : ''}`;
        embed.setTitle(titleStr);

        embed.setDescription(this.description);
        let args = '';
        if (this.args) {
            for (var j = 0; j < this.args.length; j++) {
                args += `\`${rightPad(this.args[j].name + ':', 12)}${this.args[j].type}\`\n`;
            }
            if (args.length > 0) {
                embed.addField('Arguments:', args, true);
            }
        }
        embed.addField('Usage:', `${msg.client.prefix}${this.usage}`, true);
        return embed;
    }
    /**
     * @param msg Message that invoked the command
     * @returns Whether the user who wrote the message has permission (default: true)
     */
    public hasPermission(msg: Message): boolean {
        return true; //Default to true
    }
    /**
     * Main function run when a command is executed
     * @param msg Message that invoked the command
     * @param args Arguments extracted from the message
     */
    abstract run(msg: Message, args: Map<string, any>): Promise<any>
    
}