/**
 * Created by leven on 16/8/14.
 */
const NeDB = require('nedb');
const service = require('feathers-nedb');

// Create a NeDB instance
const db = new NeDB({
    filename: './data/messages.db',
    autoload: true
});

module.exports = function(app) {

    app.use('/messages', service({
        // Use it as the service `Model`
        Model: db,
        // Enable pagination
        paginate: {
            default: 2,
            max: 4
        }
    }));

};
