import { Items } from '../imports/api/items.js';

var express = require('express');
var Ibc1 = require('ibm-blockchain-js');	
var ibc = new Ibc1();

try{
	var manual = JSON.parse(fs.readFileSync('mycreds_bluemix.json', 'utf8'));
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
						zip_url: 'https://github.com/ibm-blockchain/marbles/archive/v2.0.zip',
						unzip_dir: 'marbles-2.0/chaincode',													//subdirectroy name of chaincode after unzipped
						git_url: 'http://gopkg.in/ibm-blockchain/marbles.v2/chaincode',						//GO get http url
					
						//hashed cc name from prev deployment, comment me out to always deploy, uncomment me when its already deployed to skip deploying again
						//deployed_name: '16e655c0fce6a9882896d3d6d11f7dcd4f45027fd4764004440ff1e61340910a9d67685c4bb723272a497f3cf428e6cf6b009618612220e1471e03b6c0aa76cb'
					}
				};