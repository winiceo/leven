'use strict';

const authentication = require('feathers-authentication');

module.exports = function () {
  const app = this;

  this._env = app.get('env');
  this._conf = app.config[this._env];
  let config = this._conf.kevio.auth;
  app.logger.info("afasdf", config);
  app.configure(authentication(config));
};
//# sourceMappingURL=index.js.map
