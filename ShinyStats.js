const Discord=require('discord.js');
const bot=new Discord.Client();
const ontime = require('ontime');
const mysql = require('mysql');
const config=require('./shinyConfig.json');
const pokemonNames=require('./pokemon.json');


/*
CREATE TABLE `shiny_stats` (
  `date` date NOT NULL,
  `pokemon_id` smallint(6) unsigned DEFAULT NULL,
  `count` int(11) unsigned DEFAULT '0',
  `shiny_count` int(11) unsigned DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
*/

const possibleShiny = [1,4,7,10,16,19,23,25,27,29,32,41,43,50,52,54,56,58,60,66,72,74,77,81,83,86,88,90,92,95,96,98,103,104,109,115,116,122,123,127,128,129,131,133,138,140,142,147,152,155,158,161,177,179,190,191,193,198,200,204,207,209,213,215,220,225,227,228,246,252,255,258,261,263,270,276,278,280,287,296,302,303,304,307,309,311,312,315,318,320,325,327,328,333,335,336,337,338,339,345,347,349,351,353,355,359,361,366,370,371,374,387,390,403,425,427,436,504,506,562];

bot.login(config.token);

ontime({
	cycle:[config.runTime]
}, async function(ot) {

	await CalculateShinyStats(config.sqlConnection,config.outputChannel);

	return ot.done();
});

async function CalculateShinyStats(database, channel)
{
	
	let connection = mysql.createConnection(database);

	connection.connect(async function(error) {
		if(error)
		{
			console.log("Error connecting to SQL: "+error.stack);
				connection.end(function(err) {
					
				});
			return;
		}

		let pokemonStats = await GetShinyStats(connection);

		let date = new Date();
		let month = date.getMonth()+1;
		
		if(month == 13) {month = 1;}

		let dateString = month+"-"+date.getDate()+"-"+date.getFullYear();

		await bot.channels.get(channel).send("**Incoming shiny stats for "+dateString+"**");

		for(var pokemon in pokemonStats)
		{
			await InsertShinyStats(connection,pokemonStats[pokemon]);

			let pokemonName = pokemonNames[pokemonStats[pokemon].pokemon_id].name;

			let ratio = pokemonStats[pokemon].shiny === 0 || pokemonStats[pokemon].total === 0 ? "" : " with a **1/" + (pokemonStats[pokemon].total / pokemonStats[pokemon].shiny).toFixed() + "** ratio";

			await bot.channels.get(channel).send("**"+pokemonName+"**  |  **"+pokemonStats[pokemon].shiny+"** shiny out of **"+pokemonStats[pokemon].total+"** total seen in the last 24 hours" + ratio);    
				
		}

		connection.end();

		return;
	});
	
	
}

async function GetShinyStats(connection)
{
	return new Promise(function(resolve){
	connection.query("SELECT pokemon_id,shiny FROM pokemon where shiny is not null AND updated > UNIX_TIMESTAMP(NOW() - INTERVAL 24 HOUR);", async function(error, results) {
			
		let pokemonStats = {};
		
		for(let i = 0; i < results.length; i++)
		{
			let currentPokemon = results[i];
			if(currentPokemon.pokemon_id > 0 && possibleShiny.indexOf(currentPokemon.pokemon_id) >= 0)
			{
				if(!pokemonStats[currentPokemon.pokemon_id])
				{
					pokemonStats[currentPokemon.pokemon_id] = {shiny:0,total:0};
				}

				pokemonStats[currentPokemon.pokemon_id].pokemon_id = currentPokemon.pokemon_id;
				pokemonStats[currentPokemon.pokemon_id].shiny += currentPokemon.shiny;
				pokemonStats[currentPokemon.pokemon_id].total += 1;
				
			}
		}
		return resolve(pokemonStats);
	});
	});
}

async function InsertShinyStats(connection, pokemon)
{
	return new Promise(async function(resolve) {

		

		let sqlQuery = "INSERT INTO shiny_stats (date,pokemon_id,count,shiny_count) VALUES (CURDATE(),"+pokemon.pokemon_id+","+pokemon.total+","+pokemon.shiny+");";

		
		connection.query(sqlQuery, function(error,results) {

			return resolve(true);
		});

		
	});
}
