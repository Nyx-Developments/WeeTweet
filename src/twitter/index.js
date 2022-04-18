import he from 'he';
import humanizeDuration from 'humanize-duration';
import { ETwitterStreamEvent, ETwitterApiError } from 'twitter-api-v2';
import { getTwitClient } from './client.js';
import { MessageEmbed } from 'discord.js';
import { getInstance } from '../lib/botAdapter.js';
import config from '../../config.js';
const { custChannels, avatar } = config;
const twitterLogo = 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png';

import followRedirects from 'follow-redirects';
const { https } = followRedirects;

import Logger from '../lib/logger.js';
const logger = new Logger('TWITTER');

/**
 * REQUIRED CONFIG:
 *
 * At the root of the config:
 * crossposter: {
 *     twitter_bearer_token: 'Can get from app in dev portal',
 * }
 *
 * In individual guild settings:
 * crossposter: {
 *     twitterId: 'username or ID', // This can either be the username (excluding the @) or the user’s numeric user ID.
 *     twitChannelId: 'DiscordChannelId',
 * }
 */

// Define and send the rules for who we're listening for
async function sendRules () {
	// Get Twitter client & build rules
	const client = getTwitClient();
	const ruleList = Object.values(custChannels)
		.filter(guild => guild.crossposter?.twitterId)
		.map(guild => ({ value: `from:${guild.crossposter?.twitterId} -is:reply` }));

	try {
		// Erase previous rules
		const activeRules = await client.v2.streamRules();
		if (activeRules?.data?.length) {
			await client.v2.updateStreamRules({
				delete: { ids: activeRules.data.map(rule => rule.id) },
			});
		}

		// Add Channels to ruleset
		await client.v2.updateStreamRules({
			add: ruleList,
		});
		logger.info('Rules Loaded success!');
	} catch (e) {
		// e is either a TwitterApiRequestError or a TwitterApiError
		if (e.type === ETwitterApiError.Request) {
			// Thrown if request fails (network error).
			logger.error('Request failed.', e.requestError);
		} else if (e.type === ETwitterApiError.Response) {
			// Thrown if Twitter responds with a bad HTTP status
			logger.error(
				'Twitter didnt accept your request. HTTP code:',
				e.code,
				', parsed response data:',
				e.data,
			);
		} else {
			logger.error('Unexpected Rule Error', e);
		}
	}
}

// Return Discord channelId that matches provided twitter id or username
function findGuild (username, id) {
	const targetUname = username.toLowerCase();

	return Object
		.values(custChannels)
		.find(guild => (
			guild.crossposter?.twitterId === id ||
			guild.crossposter?.twitterId?.toLowerCase() === targetUname
		));
}

function parseRedirect (url) {
	const myURL = new URL(url);

	return new Promise((resolve, reject) => {
		try {
			const request = https.request(myURL, response => {
				if (!response.responseUrl.match(/(https?:\/\/(.+?\.)?twitter\.com)/)) {
					return resolve(response.responseUrl);
				}
				resolve();
			});
			request.end();
		} catch (e) {
			reject(e);
		}
	});
}

async function filterTweet (text) {
	const urlRegex = /(?<=^| )https?:\/\/t\.co\/\w+/mg;
	const promises = [];
	let filteredText = text
		.replace(/(?<=^| )@\w+/mg, $1 => `[${$1}](https://twitter.com/${$1.substring(1)})`)
		.replace(/(?<=^| )#\w+/mg, $1 => `[${$1}](https://twitter.com/hashtag/${$1.substring(1)})`)
		.replace(urlRegex, $1 => { promises.push(parseRedirect($1)); return $1; });

	const results = await Promise.all(promises);
	filteredText = filteredText.replace(urlRegex, () => results.shift() || '');

	return he.decode(filteredText);
}

async function checkCreateWebhook (channel, bot){
	const { username } = bot.user;

	const hook = (await channel.fetchWebhooks())
		.find(webhook => webhook.name === username );

	if (hook) return hook;

	return channel.createWebhook(username, {
		avatar,
		reason: 'Needed for twitterCrosspost WeeEve Module',
	});
}

// Construct and send embed from returned Tweet data
async function constructEmbed (tweetData) {
	// Bail if not a valid tweet by checking includes.users exists
	const userData = tweetData.includes?.users?.[0];
	if (userData === undefined) {
		logger.debug("We recieved payload data, but it wasn't quite right", JSON.stringify(tweetData, null, '\t'));
		return;
	}

	try {
		// Gather required data
		const embedColour = '#1d9bf0';
		const { name, username, id } = userData;
		const twitProfileURL = `https://www.twitter.com/${username}`;
		const tweetLink = `https://www.twitter.com/${username}/status/${tweetData.data.id}`;
		const tweetType = tweetData.data.referenced_tweets?.[0]?.type;
		const tweetMedia = tweetData.includes.media?.filter(media => media.type === 'photo' || media.type === 'animated_gif');
		const tweetImg = tweetMedia?.shift();
		let embedTitle = `${name} // Just posted a new Tweet!`;
		let tweetBody =	tweetData.includes.tweets?.[0]?.text || tweetData.data.text;

		// Check if retweet and reply specifically
		if (tweetType === 'retweeted') {
			embedTitle = `${name} // Just retweeted ${tweetData.includes.users?.[1]?.name || name}'s Tweet!`;
		}

		if (tweetType === 'quoted') {
			// Find the quoted tweet contents from referenced tweet id
			const refTweetId = tweetData.data.referenced_tweets?.[0]?.id;
			const quotedTweet = Object.values(tweetData.includes.tweets)
				.find(tweet => (tweet.id === refTweetId));

			// Match authorId to referenced user in 'included users' array
			const quotedAuthor = Object.values(tweetData.includes.users)
				.find(user => user.id ===  quotedTweet.author_id );

			embedTitle = `${name} // Just quoted ${quotedAuthor?.name || name}'s Tweet!`;
			tweetBody = tweetData.data.text;
		}

		// Format string to linkify hashtags & @mentions. Also remove https://t.co/ links as not required.
		// (This could be done with the payload's arrays for these areas, but regex easier!)
		tweetBody = await filterTweet(tweetBody);

		// Find what guild's Twitter channelid the Twitter user relates to
		const guildSettings = findGuild(username, id);

		// Return embed
		const bot = getInstance();
		const botChannel = await bot.channels.fetch(guildSettings.crossposter?.twitChannelId);
		const hook = await checkCreateWebhook(botChannel, bot);

		const responseEmbed = new MessageEmbed()
			.setURL(twitProfileURL)
			.setColor(embedColour)
			.setAuthor({
				name: embedTitle,
				url: twitProfileURL,
				iconURL: tweetData.includes.users[0].profile_image_url,
			})
			.setDescription(`${tweetBody} \n\n [**Click here to go to Tweet!**](${tweetLink})`)
			.setFooter({ text: `WeeTweet >< ${tweetData.data.source}`, iconURL: twitterLogo })
			.setTimestamp(tweetData.data.created_at)
			.setImage(tweetImg?.url || tweetImg?.preview_image_url);

		const embeds = [ responseEmbed ];
		if (tweetMedia) {
			tweetMedia
				.map(media => media.url || media.preview_image_url)
				.reduce((embedAccumulator, imageUrl) => {
					embedAccumulator.push({
						url: twitProfileURL,
						image: {
							url: imageUrl,
						},
					});
					return embedAccumulator;
				}, embeds);
		}
		if (tweetType === 'quoted') {
			responseEmbed.addField(
				'Quoted Tweet:',
				await filterTweet(tweetData.includes.tweets?.[0]?.text) || '(Quoted tweet has no text!)',
				false,
			);

		}
		await hook.send({ embeds });

		logger.info(`Tweet Crossposted to Discord: ${name}(@${username}) >>> ${botChannel.guild.name}`);
	} catch (e) {
		logger.error('Embed Error', e);
		logger.log(JSON.stringify(tweetData, null, 2));
	}
}

// Dirty little uptime broadcast
let timer;
let initTime = Date.now();
let receivedTweetCount = 0;

const announceUptime = () => {
	const dateDiff = Date.now() - initTime;
	logger.info(`TweetStream Uptime: ${humanizeDuration(dateDiff, { round: true })}`);
	logger.info(`${receivedTweetCount} tweets received during this period.`);
};
const startTimer = () => {
	initTime = Date.now(); // Log Date/Time stream started.
	timer = setInterval(announceUptime, 2000 * 60 * 60); // Log connection uptime every 2hrs
};
const stopTimer = () => {
	clearInterval(timer);
	timer = false; // clear interval promise
};

export async function initTwitterStream () {
	const reconnectMaxRetries = Infinity; // 0 for no retry

	// Bail out if no channels to listen to
	const idList = Object.keys(custChannels)
		.filter(guildId => custChannels[guildId].crossposter?.twitterId)
		.map(channel => (custChannels[channel].crossposter?.twitterId));

	if (idList.length === 0) {
		logger.warn('No Twitter Pages to stream from. Feature disabled.');
		return;
	}

	// Bail out if no app token defined
	if (!config?.crossposter?.twitter_bearer_token) {
		logger.warn('No Twitter token provided! Feature disabled.');
		return;
	}

	// Send a fresh set of rules
	await sendRules();

	try {
		const client = getTwitClient();

		// Start stream
		const stream = await client.v2.searchStream({
			'media.fields': [ 'preview_image_url', 'url' ],
			'tweet.fields': [ 'text', 'created_at', 'source', 'id' ],
			'user.fields': [ 'id', 'username', 'name', 'profile_image_url' ],
			'expansions' :
			[
				'attachments.media_keys',
				'author_id',
				'entities.mentions.username',
				'referenced_tweets.id',
				'referenced_tweets.id.author_id',
			],
		});
		startTimer();

		// Setup stream management properties
		stream.autoReconnect = true; // Enable Experimental Reconnect feature.
		stream.autoReconnectRetries = reconnectMaxRetries; // Try by min((attempt ** 2) * 1000, 25000) millisec.
		stream.keepAliveTimeoutMs = 30000; // Time to auto close if no ping is received from Twitter. (1/2 min)
		stream.nextRetryTimeout = (retryOccurence, err) => {
			// https://developer.twitter.com/en/docs/twitter-api/rate-limits#:~:text=recovering%20from%20a%20rate%20limit
			// tryOccurence starts from 1
			// Adding an extra min to timeToWait, so were not reconnecting right as 429 expires

			if (err?.code === 429) {
				// If this 429 is on the 1st retry attempt hold off for a min
				if (retryOccurence === 1) return 60000;

				const resetTimeout = err.rateLimit?.reset * 1000; // Convert to ms instead of seconds
				const timeToWait = (resetTimeout + 60000) - Date.now();
				logger.debug(`429 Rate-limit, Reset in: ${humanizeDuration(timeToWait, { round: true })}`);

				return timeToWait;
			}

			// For anything else, copy default retry function
			const basicReconnectRetry = retryOccurence => {
				const basicRetriesAttempt = [ 5, 15, 30, 60, 90, 120, 180, 300, 600, 900 ]; // In secs
				const delay = retryOccurence > basicRetriesAttempt.length
					? 901000 // If backoff Exceeds basic timings wait 15min
					: basicRetriesAttempt[retryOccurence - 1] * 1000;

				return delay;
			};

			return basicReconnectRetry(retryOccurence);
		};


		/**
 		 * Await for a tweet
 		 **/
		stream.on(
			// Emitted when a Twitter payload (a tweet or not, given the endpoint).
			ETwitterStreamEvent.Data,
			eventData => {
				constructEmbed(eventData);
				receivedTweetCount++;
			},
		);
		logger.info(`TweetStream opened, Listening for tweets from ${idList.toString()}!`);

		/**
 		 * Error Handle
 		 **/
		stream.on(
			// Emitted when Node.js {response} emits a 'error' event (contains its payload).
			ETwitterStreamEvent.ConnectionError,
			err => logger.error('Connection error!', JSON.stringify(err, null, '\t')),
		);
		stream.on(
			// Emitted when the thing sent by Twitter cannot be JSON-parsed. Contains the parse error.
			ETwitterStreamEvent.TweetParseError,
			err => logger.error('Payload parse error!', JSON.stringify(err, null, '\t')),
		);
		stream.on(
			// Emitted when Twitter sends a JSON error payload
			ETwitterStreamEvent.DataError,
			err => logger.error('Twitter remote error!', JSON.stringify(err, null, '\t')),
		);
		stream.on(
			// Emitted when a auto-reconnect try attempt has failed. (Event data count starts from 0).
			ETwitterStreamEvent.ReconnectError,
			() => logger.error('Failed to reconnect to Twitter.'),
		);
		stream.on(
			// Emitted when .autoReconnectRetries limit exceeds.
			ETwitterStreamEvent.ReconnectLimitExceeded,
			() => {
				logger.error('Failed to re-establish connection to Twitter Endpoint. [Connection Dead, disabling feature.]');
				stopTimer();
			},
		);


		/**
 		 * Connection Events
 		 **/
		stream.on(
		// Emitted when Node.js {response} is closed by remote or using .close()
			ETwitterStreamEvent.ConnectionClosed,
			() => {
				logger.warn('Connection has been closed.');
				stopTimer();
			},
		);
		stream.on(
		// Emitted when nothing is received from Twitter during .keepAliveTimeoutMs milliseconds
			ETwitterStreamEvent.ConnectionLost,
			() => {
				logger.warn('Connection has been lost will attempt a reconnect.');
				stopTimer();
			},
		);
		stream.on(
			// Emitted before a reconnect attempt is made (payload: attempt number).
			ETwitterStreamEvent.ReconnectAttempt,
			eventData => logger.warn(`Attempting to reconnect to Twitter. [Try attempt: ${eventData}/${reconnectMaxRetries}]`),
		);
		stream.on(
			// Emitted when a reconnection attempt succeeds.
			ETwitterStreamEvent.Reconnected,
			() => {
				logger.info(`Connection to twitter has been restored. Listening for tweets from ${idList.toString()}!`);
				startTimer();
				receivedTweetCount = 0;
			},
		);

	} catch (e) {
		// e is either a TwitterApiRequestError or a TwitterApiError
		if (e.type === ETwitterApiError.Request) {
			// Thrown if request fails (network error).
			logger.error('Request failed.', e.requestError);
		} else if (e.type === ETwitterApiError.Response) {
			// Thrown if Twitter responds with a bad HTTP status
			logger.error(
				'Twitter didnt accept your request. HTTP code:',
				e.code,
				', parsed response data:',
				e.data,
			);
		} else {
			logger.error('Unexpected Error', e);
		}
	}
}
