import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

import './items.html';

import { Items } from '../api/items.js'

Template.item.onCreated(function itemOnCreated() {
    this.state = new ReactiveDict();
});

Template.item.events({
    'click .delete'() {
        Items.remove(this._id);
    },
});
