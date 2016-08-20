'use strict';
const article = require('./article');
const note = require('./note');
const authentication = require('./authentication');
const user = require('./user');

module.exports = function() {
  const app = this;


  app.configure(authentication);
  app.configure(user);
  app.configure(note);
  app.configure(article);
};
