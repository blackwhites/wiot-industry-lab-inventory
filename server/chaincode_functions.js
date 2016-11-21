var ibc = {};
var chaincode = {};


module.exports.setup = function(sdk, cc){
	ibc = sdk;
	chaincode = cc;
};

module.exports.cc_invoke = function(data){																					//only look at messages for part 1
		if(data.type == 'create'){
			console.log('its a create!');
			chaincode.invoke.write([data.guid,data.description], cb_invoked);	//create a new marble
		}
		else if(data.type == 'get'){
			console.log('get marbles msg');
			chaincode.query.read(['_marbleindex'], cb_got_index);
		}
		else if(data.type == 'transfer'){
			console.log('transfering msg');
			if(data.name && data.user){
				chaincode.invoke.set_user([data.name, data.user]);
			}
		}
		else if(data.type == 'remove'){
			console.log('removing msg');
			if(data.name){
				chaincode.invoke.delete([data.name]);
			}
		}
		else if(data.type == 'chainstats'){
			console.log('chainstats msg');
			ibc.chain_stats(cb_chainstats);
		}
}
	