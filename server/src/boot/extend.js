
const rest = require('feathers-rest');

const services = require('./../app/services');
const hooks = require('feathers-hooks');
const socketio = require('feathers-socketio');
const middleware = require('./../app/middleware');
// const configuration = require('feathers-configuration');
// const path=require('path');

module.exports = function(app) {

    var _log = app.system.logger;



    try {
        //app.configure(configuration(path.join(__dirname, '..')));

        app
            .configure(hooks())
            .configure(rest())
            .configure(socketio())
            .configure(services);

        //app.configure(middleware);
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




