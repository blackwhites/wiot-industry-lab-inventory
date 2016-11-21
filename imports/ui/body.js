
import {cc} from '../../server/main';
var chaincode_functions = require('../../server/chaincode_functions');
var Ibc1 = require('ibm-blockchain-js');                                                        //rest based SDK for ibm blockchain
var ibc = new Ibc1();



import { Template } from 'meteor/templating';

import './items.js';

import { Items } from '../api/items.js';

import './body.html';

Template.body.events({
    'submit .new-item'(event) {
        
        // Prevent default browser form submit
        event.preventDefault();
        
        // Get value from form element
        const target = event.target;
        const guid = Math.floor((Math.random() * 10000) + 1);
        const description = target.description.value;
        
        // Invoke chaincode to create asset

        chaincode_functions.setup(ibc,cc);
        data = {"type":"create",
                "guid":guid,
                "description":description};
        chaincode_functions.cc_invoke(data);

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
