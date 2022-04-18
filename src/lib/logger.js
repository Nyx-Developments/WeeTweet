/* eslint-disable no-console */
import moment from 'moment';
import util from 'util';

const levels = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const colours = {
	reset: '\x1B[0m',
	label: '\x1B[1;97m', // Bold white text
	debug: '\x1B[34m', // Blue text
	info: '\x1B[32m', // Green text
	warn: '\x1B[33m', // Yellow text
	error: '\x1B[1;31m', // Bold red text
};

const formats = {
	object: '%o',
	number: '%d',
	default: '%s',
};

export default class Logger {
	constructor (label, dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS') {
		this._label = label;
		this._dateFormat = dateFormat;
	}

	/**
	 * @param {string} currentLevel Level used by the logging function
	 */
	static atLevel (currentLevel) {
		const targetLevel = levels[process.env.LOG_LEVEL] !== undefined
			? process.env.LOG_LEVEL
			: 'debug';

		if (levels[currentLevel] === undefined) {
			currentLevel = 'debug';
		}

		return levels[currentLevel] >= levels[targetLevel];
	}

	/**
	 * @param {string} level One of debug, info, warn, error
	 * @param {any[]}  args  Items to print
	 */
	format (level, args) {
		const timestamp = moment().format(this._dateFormat);
		const argTypes = args
			.map(a => formats[typeof a] || formats.default)
			.join(' ');
		const formatted = util.format(argTypes, ...args);
		const colour = colours[level] || colours.reset;

		return `[${timestamp}] [${colours.label}${this._label}${colours.reset}] [${colour}${level}${colours.reset}] ${formatted}`;
	}

	log (...args) {
		if (!Logger.atLevel('debug')) return;
		console.debug(this.format('debug', args));
	}

	debug (...args) {
		if (!Logger.atLevel('debug')) return;
		console.debug(this.format('debug', args));
	}

	info (...args) {
		if (!Logger.atLevel('info')) return;
		console.info(this.format('info', args));
	}

	warn (...args) {
		if (!Logger.atLevel('warn')) return;
		console.warn(this.format('warn', args));
	}

	error (...args) {
		if (!Logger.atLevel('error')) return;
		console.error(this.format('error', args));
	}
}
