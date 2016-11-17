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
    'click .edit'(event, template) {
        template.state.set('isEditing', true);
    },
    'click .cancel'(event, template) {
        template.state.set('isEditing', false);
    },
});

Template.item.helpers({
    isEditing() {
        return Template.instance().state.get('isEditing');
    },
});
