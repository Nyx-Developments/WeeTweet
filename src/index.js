// Load the config
import config from '../config.js';

// Bot object - MESSAGE & REACTION partials so we can handle reacts on older messages
import * as BotAdapter from './lib/botAdapter.js';
const bot = BotAdapter.getInstance();

import { initTwitterStream } from './twitter/index.js';

import Logger from './lib/logger.js';
const logger = new Logger('DISCORD');

// Setup events
bot.once('ready', () => {
	logger.info('Client Ready');
	initTwitterStream();
});

// Error Listeners
bot.on('error', payload => {
	logger.error(payload);
});
bot.on('warn', payload => {
	logger.warn(payload);
});

// Now we've configured the bot, login to enable it all :)
bot.login(config.token);
