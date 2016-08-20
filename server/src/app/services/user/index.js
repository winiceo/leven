'use strict';

const path = require('path');

const service = require('feathers-mongoose');
const hooks = require('./hooks');

const user = require('./user-model');

module.exports = function(){
  const app = this;

  const options = {
    Model: user,
    paginate: {
      default: 10,
      max: 25
    }
  };
  // Initialize our service with any options it requires
  app.use('/api/v1/users', service(options));

  // Get our initialize service to that we can bind hooks
  const userService = app.service('/users');

  // Set up our before hooks
  userService.before(hooks.before);

  // Set up our after hooks
  userService.after(hooks.after);
};
