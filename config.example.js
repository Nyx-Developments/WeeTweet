export default {
	// Used for Discord API
	token: '', // process.env.DISCORD_TOKEN

	// Used for Twitter API
	crossposter: {
		twitter_bearer_token: '', // process.env.TWITTER_BEARER_TOKEN
	},

	avatar: 'https://i.imgur.com/5PncDmI.png', // Webhook Avatar

	custChannels: {
		'guildId': {
			crossposter: {
				twitterId: 'twitterId', // The value can be either the username (excluding the @ character) or the user’s numeric user ID
				twitChannelId: 'channelId', // twitter🐦
			},
		},
	},
};
