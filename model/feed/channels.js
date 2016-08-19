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
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        n  : {type: String, required: true, alias: 'name'},
        s  : {type: ObjectId, ref: 'Feed_Sources', alias: 'sources'},
        u  : {type: String, required: true, alias: 'url', pattern: 'url'},
        c  : [{type: ObjectId, ref: 'Feed_Categories', alias: 'categories'}],
        t  : {type: String, default: 'R', enum: ['R', 'A'], alias: 'type'}, // R: RSS, A: Agency
        ln : {type: String, default: 'en', enum: ['en', 'tr'], alias: 'language'},
        ie : {type: String, default: 'Y', enum: ['Y', 'N'], alias: 'is_enabled'},
        ca : {type: Date, alias: 'created_at', default: Date.now}
    };
    
    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings    = {label: 'Name'};
    Schema.s.settings    = {label: 'Source', display: 'name'};
    Schema.u.settings    = {label: 'Url'};
    Schema.c[0].settings = {label: 'Categories', display: 'name'};
    
    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    const ChannelSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Feed_Channels',
        Options: {
            singular : 'Feed Channel',
            plural   : 'Feed Channels',
            columns  : ['name'],
            main     : 'name',
            perpage  : 25
        }
    });

    // plugins
    ChannelSchema.plugin(_query);

    // compound index
    ChannelSchema.index({ap: 1, n: 1}, {unique: true});
    ChannelSchema.index({ap: 1, u: 1}, {unique: true, sparse: true});
    
    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    ChannelSchema.pre('save', function (next) {

        const self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    ChannelSchema.post('save', function (doc) {

        const self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('Feed_Channels', ChannelSchema);

};





