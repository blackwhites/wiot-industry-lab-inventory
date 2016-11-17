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
