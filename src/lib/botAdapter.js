import { Client, Intents } from 'discord.js';

let bot;

/**
 * Singleton method that will always return the same client, once instantiated
 * @return {Discord.Client}
 */
export function getInstance () {
	if (bot !== undefined) return bot;

	bot = new Client({
		// Bot Requires the 'Manage Webhooks' Permission
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_WEBHOOKS,
		],
	});
	return bot;
}
