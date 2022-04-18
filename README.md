![Imgur](https://i.imgur.com/lxxXUrt.png)
# WeeTweet

A simple-ish bot for cross-posting Tweets to Discord! Ported out of my
personal Discord bot 'WeeEve'.

### Why?
Back when I first made my first Discord server,
I used IFTTT to automate sending posts to channels via webhooks. This worked fine for my
needs at the time but then they went paid and I didn't want to have it as an expense.

When I was first making this for my bot WeeEve, my friend working on the project with me asked:
> `"Why not just have it simply just post a link and let discord just do the formatting?"`
>
> I just thought it'd be cool and fun to make it fancy!✨ you can click things, it formats it
all pretty!
<br><br>
## Features
- Minimal setup, quick and easy forwarding of Tweet content to Discord.
- Replacement of '**# tags**' and '**@ mentions**' with nice markdown formatted links.
  *Just like it looks on Twitter.*
- No obscure https://t.co/ links, redirects are followed giving the real link
  and unnecessary links are discarded.
- Embed with webhooks! This allows the bot to have an  incredibly minimal permissions scope,
  only requiring the `Manage Webhooks` permission to function. (This was also abit of a
  workaround as Discord didn't like multi-image blocks in a standard embed at the time of
  writing this, only displaying a single image, instead of 4x4 grid.)

## Screenshots
Below are examples of the output of a crossposted tweet (Tweet replies are ignored!):

#### Post:
![Just Posted a Tweet](https://i.imgur.com/hv1rCTm.png)
#### Retweet:
![Just retweeted a Tweet](https://i.imgur.com/QUlyxay.png)
#### Quoted Tweet:
![Just retweet a Tweet](https://i.imgur.com/lYNF4rm.png)


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file
| Variable     | Description |
| ----------- | ----------- |
| `TWITTER_BEARER_TOKEN` | Obtainable via Twitter Developer Portal|
| `DISCORD_TOKEN` | Obtainable via Discord Developer Portal <br> *Minimum permission scoope required: `Manage Webhooks`* |

## Config
Found in `config.js` guildId is not entirely required and is an artifact from my main bot,
if you are looking to subscribe to different channels in the same server, make multiple blocks
and name whatever you like. This won't be changed for now, but do see the [Roadmap](#roadmap)
though!
```js
...
	avatar: 'https://i.imgur.com/5PncDmI.png', // Webhook Avatar

	custChannels: {
		'guildId': {
			crossposter: {
				twitterId: 'twitterId', // The value can be either the username (excluding the @ character) or the user’s numeric user ID
				twitChannelId: 'channelId', // twitter🐦
			},
		},
        'whateverYouLike': {
			crossposter: {
				twitterId: 'twitterId', // The value can be either the username (excluding the @ character) or the user’s numeric user ID
				twitChannelId: 'channelId', // twitter🐦
			},
		},
        // guildId3 : { ...etc
	},
```
## Deployment

Start off by cloning down the repository applying your config with the above environment.

```
$ git clone git@gitlab.com:Zedifus/weetweet.git
$ cd weetweet
$ npm start
```
I have also included a `docker-compose` config. Just simply clone like above, configure and use
```
$ docker-compose up -d && docker-compose logs -f
```


## Acknowledgements

 - [TomboFry](https://gitlab.com/TomboFry) & [Rozza](https://gitlab.com/rchar) - For their
   assistance in peer review, helping keep me on track with best ES6 practice and advising
   on code choice and improvements.
 - [Twitter-API-V2](https://github.com/PLhery/node-twitter-api-v2) and it's maintainer
   [alkihis](https://github.com/alkihis) for assisting me in issues I was having with
   anomolies the TwitterAPI-V2 Endpoints.

## Roadmap

- **Config-less Deployments,**
  So pretty much all you need to feed it is `.env` variables with it's required tokens
  and configure the rest via a `(/) command` triggered, interaction based menu system
  in Discord.

- **File based database,** Remove the requirement of an addition database engine (*Like Sqlite
  or MongoDB*) for the above config change. Spawning a `json5` file for each server
  containing it's channels and paired listners. (I feel this will be fun and different).

- **Pre-built Docker Image,** this will be around the same time as the above config changes
  as will be easier to deploy from image, I plan on making the provided image multi-arch
  `amd64` & `arm64`. Maybe more!


## Contributing

Contributions are always welcome!

I am always seeking to learn and improve, so if you have ideas, feel free to open a MR!
## Credit / Donations
I don't want your money, or mind wither you rebrand my code in your projects if you
happen to use it, if it's helped you or you have deployed it. All I ask is please
just pop a wee star on this repository, and adhere to the below licence.

It'd mean the world to me 🥰
## License

[GPL-V3.0](https://choosealicense.com/licenses/gpl-3.0/)

