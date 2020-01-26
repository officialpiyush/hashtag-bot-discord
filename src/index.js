const { CommandClient, TextChannel } = require("eris");
const Collection = require("@discordjs/collection");
const { Pool } = require("pg");
require("dotenv").config({path: "../.env"});

const db = new Pool({
	connectionString: process.env.DATABASE_URI
});

const client = new CommandClient(process.env.TOKEN,{}, {
	prefix: ["@mention", "."],
	description: "Hashtag bot.",
	owner: "Piyush#4332"
});

client.on("ready", async () => {
	console.log("[BOT] Ready");
	await db.connect();
});

db.on("connect", async () => {
	console.log("[DATABASE] Ready");
	await db.query(`CREATE TABLE IF NOT EXISTS hashtags (
		name VARCHAR(2500) PRIMARY KEY NOT NULL,
		uses INT NOT NULL,
		server_id VARCHAR(18) NOT NULL
	)
`);

	await db.query(`CREATE TABLE IF NOT EXISTS updates (
		id VARCHAR(18) PRIMARY KEY NOT NULL,
		message_id VARCHAR(18) NOT NULL,
		channel_id VARCHAR(18) NOT NULL
	)
`);
});

const cooldowns = new Collection();


client.on("messageCreate", async (message) => {
	if(message.author.bot || !(message.channel instanceof TextChannel)) return;
	if(!message.content.match(/#\w+/g)) return;
	const hashtags = message.content.match(/#\w+/g).map(x => x.substr(1).toLowerCase()) || [];

	for(const hashtag of hashtags) {
		if(message.channelMentions.includes(hashtag)) continue;
		if(!cooldowns.has(hashtag)) {
			cooldowns.set(hashtag, new Collection());
		}

		const users = cooldowns.get(hashtag);
		if(users.has(message.author.id)) continue;

		try {
			const res = await db.query("SELECT * FROM hashtags WHERE name = $1", [hashtag]);
			if(res.rows.length <= 0) {
				await db.query(`INSERT INTO
					hashtags (name, uses, server_id)
					VALUES ($1, $2, $3)
				`, [hashtag, 1, message.channel.guild.id]);
			} else {
				await db.query(`UPDATE hashtags 
					SET uses = uses + 1
					WHERE name = $1 
				`, [hashtag]);
			}

			users.set(message.author.id, Date.now());

			setTimeout(() => users.delete(message.author.id), 600000);
		} catch(err) {
			console.log(err);
		}
	}
});

const hashtagCommand = client.registerCommand("hashtag", "Nothing here boi", {
	description: "Parent command or something.",
});

hashtagCommand.registerSubcommand("leaderboard", async (message, args) => {
	if(!(message.channel instanceof TextChannel)) return;
	try {
		const res = await db.query("SELECT * FROM hashtags WHERE server_id = $1 ORDER BY uses DESC LIMIT 5", [message.channel.guild.id]);

		if(res.rows.length <= 0) {
			await message.channel.createMessage("No hashtags found.");
			return;
		}

		let returnMessage = "\n";

		for(const row of res.rows) {
			returnMessage += `**#${row.name}** - ${row.uses} uses\n\n`;
		}

		await message.channel.createMessage({  
			"embed": {
				"title": `Trending for ${message.channel.guild.name}`,
				"description": returnMessage,
				"color": 3090816
			}
		});
		return;
	} catch(err) {
		await message.channel.createMessage(`An error occured:\`\`\`${err}\`\`\``)
	}
}, {
	description: "Get the trending leaderboard for the server"
})

hashtagCommand.registerSubcommandAlias("lb", "leaderboard");


client.registerCommandAlias("ht", "hashtag");
client.registerCommandAlias("hash", "hashtag");
client.registerCommandAlias("#", "hashtag");

client.connect();