import php from 'phpjs';
import _ from 'underscore';

export default function(app) {

    const _env      = app.get('env');
    const _log      = app.lib.logger;
    const _mongoose = app.core.mongo.mongoose;
    const _query    = app.lib.query;
    const _emitter  = app.lib.schemaEmitter;

    // types
    const ObjectId  = _mongoose.Schema.Types.ObjectId;
    const Mixed     = _mongoose.Schema.Types.Mixed;

    /**
     * ----------------------------------------------------------------
     * Schema
     * ----------------------------------------------------------------
     */

    const Schema = {
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps', index: true},
        ir : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users', index: true},
        n  : {type: String, required: true, alias: 'name'},
        t  : {type: String, alias: 'title'},
        ut : {type: String, default: 'U', required: true, enum: ['A', 'U'], alias: 'upload_type'}, // A: Admin, U: User
        ty : {type: String, required: true, enum: ['L', 'S', 'C'], alias: 'type'}, // L: Local, S: Aws S3, C: Cloudinary
        b  : {type: Number, default: 0, alias: 'bytes'},
        u  : {type: String, alias: 'url'},
        p  : {type: String, alias: 'path'},
        w  : {type: Number, default: 0, alias: 'width'},
        h  : {type: Number, default: 0, alias: 'height'},
        e  : {type: String, alias: 'ext'},
        ca : {type: Date, alias: 'created_at', default: Date.now}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings = {label: 'Name'};
    Schema.t.settings = {label: 'Title'};
    Schema.p.settings = {label: 'Path'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    const formsObj = {
        filter: ['name', 'title', 'path']
    };
    formsObj['new'] = ['name', 'title'];
    
    const ImageSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Images',
        Options: {
            singular : 'System Image',
            plural   : 'System Images',
            columns  : ['name', 'title', 'path', 'bytes', 'width', 'height'],
            extra    : ['type'], // extra fields
            main     : 'name',
            perpage  : 10
        },
        Forms: formsObj
    });


    // plugins
    ImageSchema.plugin(_query);

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    ImageSchema.pre('save', function (next) {

        const self    = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    ImageSchema.post('save', function (doc) {

        const self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Images', ImageSchema);

};

