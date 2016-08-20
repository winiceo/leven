/**
 * Created by leven on 16/8/14.
 */

var async = require('async');
var _ = require('underscore');

module.exports = function (app) {

    var _mdl = app.middle;
    var _schema = app.lib.schema;
    var _mongoose = app.core.mongo.mongoose;
    // var Kitten         = _mongoose.model('blogs');
    // app.get('/api/note',
    //
    //     function(req, res, next) {
    //
    //         Kitten.find(function (err, kittens) {
    //             if (err) return console.error(err);
    //             console.log(kittens);
    //             res.json(kittens)
    //         })
    //
    //     });
    //
    // app.post('/api/note',
    //
    //     function(req, res, next) {
    //
    //         var personEntity = new Kitten(req.body);
    //
    //         personEntity.save(function (err, kittens) {
    //             if (err) return console.error(err);
    //             console.log(kittens);
    //             res.json(kittens)
    //         })
    //
    //          var schema = new _schema('blogs').init(req, res, next);
    //
    //         if(schema)
    //             schema.post(req.body);
    //     });
};
//# sourceMappingURL=note.js.map
