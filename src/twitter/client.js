import { TwitterApi } from 'twitter-api-v2';
import config from '../../config.js';

let client = null;

export function getTwitClient () {
	if (client !== null) return client;

	client = new TwitterApi(config?.crossposter?.twitter_bearer_token).readOnly;
	return client;
}
