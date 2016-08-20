/**
 * Created by leven on 16/8/14.
 */

var async = require('async');
var _ = require('underscore');

module.exports = function (app) {

    var _mdl = app.middle;
    var _schema = app.lib.schema;

    var _log = app.system.logger;
    var log = app.lib.logger;

    app.get('/api/leven', function (req, res, next) {

        log.error("asdfsad", 'asdfasd');
        _log.log('info', 'asdfasdf');
        res.json({ a: 1 });
    });

    app.post('/api/leven', function (req, res, next) {

        var schema = new _schema('blog').init(req, res, next);

        if (schema) schema.post(req.body);
    });
};
//# sourceMappingURL=leven.js.map
