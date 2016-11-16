import { Meteor } from 'meteor/meteor';

export const Items = new Meteor.Pagination("items", {
    itemTemplate: 'item',
    divWrapper: false
});
