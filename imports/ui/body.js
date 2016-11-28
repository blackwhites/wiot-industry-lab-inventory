

import { Template } from 'meteor/templating';

import './items.js';

import { Items } from '../api/items.js';

import './body.html';


//import {cc} from '../../server/main.js';
//var cc = require('../../server/main');
//var chaincode_functions = require('../../server/chaincode_functions');
var Ibc1 = require('ibm-blockchain-js');                                                        //rest based SDK for ibm blockchain
var ibc = new Ibc1();


Template.body.events({
    'submit .new-item'(event) {
        
        // Prevent default browser form submit
        event.preventDefault();
        
        // Get value from form element
        const target = event.target;
        const guid = Math.floor((Math.random() * 10000) + 1);
        const description = target.description.value;
        
        //alert("../..server");
        console.log(description);
        // Invoke chaincode to create asset

        setup(ibc,cc);
        data = {"type":"create",
                "guid":guid,
                "description":description};
        cc_invoke(data);

        // Insert an item into the collection
        Items.insert({
            guid,
            description,
            createdAt: new Date(), // current time
        });
        
        // Clear form
        target.description.value = '';
        
    },
});

var ibc = {};
var chaincode = {};


function setup(sdk, cc){
    ibc = sdk;
    chaincode = cc;
};

function cc_invoke(data){                                                                                  //only look at messages for part 1
        if(data.type == 'create'){
            console.log('its a create!');
            chaincode.invoke.write([data.guid,data.description], cb_invoked);   //create a new marble
        }
    
};
    

