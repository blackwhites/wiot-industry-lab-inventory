import { Items } from '../imports/api/items.js';

var express = require('express');
var fs = require('fs');
var Ibc1 = require('ibm-blockchain-js');	
var ibc = new Ibc1();

console.log("---------HELLLOOOO-------------");
console.log(process.cwd());

var projectRootServer="../../../../../server";
try{
	var manual = JSON.parse(fs.readFileSync(projectRootServer+'/mycreds_bluemix.json', 'utf8'));

	var peers = manual.credentials.peers;
	console.log('loading hardcoded peers');
	var users = null;																			//users are only found if security is on
	if(manual.credentials.users) users = manual.credentials.users;
	console.log('loading hardcoded users');
}
catch(e){
	console.log('Error - could not find hardcoded peers/users, this is okay if running in bluemix');
}

//filter for type1 users if we have any
function prefer_type1_users(user_array){
	var ret = [];
	for(var i in users){
		if(users[i].enrollId.indexOf('type1') >= 0) {	//gather the type1 users
			ret.push(users[i]);
		}
	}

	if(ret.length === 0) ret = user_array;				//if no users found, just use what we have
	return ret;
}

//see if peer 0 wants tls or no tls
function detect_tls_or_not(peer_array){
	var tls = false;
	if(peer_array[0] && peer_array[0].api_port_tls){
		if(!isNaN(peer_array[0].api_port_tls)) tls = true;
	}
	return tls;
}

// ==================================
// configure options for ibm-blockchain-js sdk
// ==================================

var options = 	{
					network:{
						peers: [peers[0]],																	//lets only use the first peer! since we really don't need any more than 1
						users: prefer_type1_users(users),													//dump the whole thing, sdk will parse for a good one
						options: {
									quiet: true, 															//detailed debug messages on/off true/false
									tls: detect_tls_or_not(peers), 											//should app to peer communication use tls?
									maxRetry: 1																//how many times should we retry register before giving up
								}
					},
					chaincode:{
						//zip_url: 'https://github.com/ibm-blockchain/marbles/archive/v2.0.zip',
						//unzip_dir: 'marbles-2.0/chaincode',													//subdirectroy name of chaincode after unzipped
						git_url: 'http://gopkg.in/mgzeitouni/wiot-industry-lab-inventory.v0/chaincode',						//GO get http url
					
						//hashed cc name from prev deployment, comment me out to always deploy, uncomment me when its already deployed to skip deploying again
						//deployed_name: '16e655c0fce6a9882896d3d6d11f7dcd4f45027fd4764004440ff1e61340910a9d67685c4bb723272a497f3cf428e6cf6b009618612220e1471e03b6c0aa76cb'
					}
				};

// ---- Fire off SDK ---- //
var chaincode = null;																		//sdk will populate this var in time, lets give it high scope by creating it here
ibc.load(options, function (err, cc){														//parse/load chaincode, response has chaincode functions!
	if(err != null){
		console.log('! looks like an error loading the chaincode or network, app will fail\n', err);
		if(!process.error) process.error = {type: 'load', msg: err.details};				//if it already exist, keep the last error
	}
	else{
		console.log('here');
		chaincode = cc;
		part1.setup(ibc, cc);																//pass the cc obj to part 1 node code
		part2.setup(ibc, cc);																//pass the cc obj to part 2 node code

		// ---- To Deploy or Not to Deploy ---- //
		if(!cc.details.deployed_name || cc.details.deployed_name === ''){					//yes, go deploy
			cc.deploy('init', ['99'], {delay_ms: 30000}, function(e){ 						//delay_ms is milliseconds to wait after deploy for conatiner to start, 50sec recommended
				check_if_deployed(e, 1);
			});
		}
		else{																				//no, already deployed
			console.log('chaincode summary file indicates chaincode has been previously deployed');
			check_if_deployed(null, 1);
		}
	}
});


//loop here, check if chaincode is up and running or not
function check_if_deployed(e, attempt){
	if(e){
		cb_deployed(e);																		//looks like an error pass it along
	}
	else if(attempt >= 15){																	//tried many times, lets give up and pass an err msg
		console.log('[preflight check]', attempt, ': failed too many times, giving up');
		var msg = 'chaincode is taking an unusually long time to start. this sounds like a network error, check peer logs';
		if(!process.error) process.error = {type: 'deploy', msg: msg};
		cb_deployed(msg);
	}
	else{
		console.log('[preflight check]', attempt, ': testing if chaincode is ready');
		chaincode.query.read(['_marbleindex'], function(err, resp){
			var cc_deployed = false;
			try{
				if(err == null){															//no errors is good, but can't trust that alone
					if(resp === 'null') cc_deployed = true;									//looks alright, brand new, no marbles yet
					else{
						var json = JSON.parse(resp);
						if(json.constructor === Array) cc_deployed = true;					//looks alright, we have marbles
					}
				}
			}
			catch(e){}																		//anything nasty goes here

			// ---- Are We Ready? ---- //
			if(!cc_deployed){
				console.log('[preflight check]', attempt, ': failed, trying again');
				setTimeout(function(){
					check_if_deployed(null, ++attempt);										//no, try again later
				}, 10000);
			}
			else{
				console.log('[preflight check]', attempt, ': success');
				cb_deployed(null);															//yes, lets go!
			}
		});
	}
}

// ============================================================================================================================
// 												WebSocket Communication Madness
// ============================================================================================================================
function cb_deployed(e){
	if(e != null){
		//look at tutorial_part1.md in the trouble shooting section for help
		console.log('! looks like a deploy error, holding off on the starting the socket\n', e);
		if(!process.error) process.error = {type: 'deploy', msg: e.details};
	}
	else{
		console.log('------------------------------------------ Websocket Up ------------------------------------------');
		
		wss = new ws.Server({server: server});												//start the websocket now
		wss.on('connection', function connection(ws) {
			ws.on('message', function incoming(message) {
				console.log('received ws msg:', message);
				try{
					var data = JSON.parse(message);
					part1.process_msg(ws, data);											//pass the websocket msg to part 1 processing
					part2.process_msg(ws, data);											//pass the websocket msg to part 2 processing
				}
				catch(e){
					console.log('ws message error', e);
				}
			});
			
			ws.on('error', function(e){console.log('ws error', e);});
			ws.on('close', function(){console.log('ws closed');});
		});
		
		wss.broadcast = function broadcast(data) {											//send to all connections
			wss.clients.forEach(function each(client) {
				try{
					client.send(JSON.stringify(data));
				}
				catch(e){
					console.log('error broadcast ws', e);
				}
			});
		};
		
		// ========================================================
		// Monitor the height of the blockchain
		// ========================================================
		ibc.monitor_blockheight(function(chain_stats){										//there is a new block, lets refresh everything that has a state
			if(chain_stats && chain_stats.height){
				console.log('hey new block, lets refresh and broadcast to all', chain_stats.height-1);
				ibc.block_stats(chain_stats.height - 1, cb_blockstats);
				wss.broadcast({msg: 'reset'});
				chaincode.query.read(['_marbleindex'], cb_got_index);
				chaincode.query.read(['_opentrades'], cb_got_trades);
			}
			
			//got the block's stats, lets send the statistics
			function cb_blockstats(e, stats){
				if(e != null) console.log('blockstats error:', e);
				else {
					chain_stats.height = chain_stats.height - 1;							//its 1 higher than actual height
					stats.height = chain_stats.height;										//copy
					wss.broadcast({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
				}
			}
			
			//got the marble index, lets get each marble
			function cb_got_index(e, index){
				if(e != null) console.log('marble index error:', e);
				else{
					try{
						var json = JSON.parse(index);
						for(var i in json){
							console.log('!', i, json[i]);
							chaincode.query.read([json[i]], cb_got_marble);					//iter over each, read their values
						}
					}
					catch(e){
						console.log('marbles index msg error:', e);
					}
				}
			}
			
			//call back for getting a marble, lets send a message
			function cb_got_marble(e, marble){
				if(e != null) console.log('marble error:', e);
				else {
					try{
						wss.broadcast({msg: 'marbles', marble: JSON.parse(marble)});
					}
					catch(e){
						console.log('marble msg error', e);
					}
				}
			}
			
			//call back for getting open trades, lets send the trades
			function cb_got_trades(e, trades){
				if(e != null) console.log('trade error:', e);
				else {
					try{
						trades = JSON.parse(trades);
						if(trades && trades.open_trades){
							wss.broadcast({msg: 'open_trades', open_trades: trades.open_trades});
						}
					}
					catch(e){
						console.log('trade msg error', e);
					}
				}
			}
		});
	}
}