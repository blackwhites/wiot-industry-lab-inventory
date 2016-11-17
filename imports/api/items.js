import { Meteor } from 'meteor/meteor';

export const Items = new Mongo.Collection('items');

export const Pages = new Meteor.Pagination(Items, {
    itemTemplate: 'item',
    divWrapper: false
});
