import acl from 'acl';

function Acl(req, res, next) {

    const _app   = req.app;
    const _log   = _app.lib.logger;
    const _resp  = _app.system.response.app;
    const _group = 'MIDDLE:ACL';

    // acl middleware'inden sonra object route'una düşünce bunu sorgu parametresi olarak kabul etmemesi için siliyoruz
    if(_app.oauth)
        delete req.query.access_token;

    const user = req.__user ? req.__user.id : false;

    if(user) {
        const id     = req.params.id;
        const object = req.params.object.replace('.', '_'); // acl sisteminde object isimleri "." yerine "_" ile tutulduğu için değiştiriyoruz
        const method = req.method.toLowerCase();

        _app.acl.allowedPermissions(user, [object], (err, results) => {
            _log.middle(_group+':USER:'+user, results);

            if( err || ! results[object] )
                return next( _resp.Forbidden() );

            // master access
            if(results[object][0] == '*' || results[object].indexOf(method+'*') != -1) {
                req.__master = true;
                return next();                
            }
            
            if(results[object].indexOf(method) == -1)
                return next( _resp.Forbidden() );

            next();
        });
    }
    else
        next( _resp.Forbidden() );

}

export default function(app) {

    // get mongoose
    const mongoose = app.core.mongo.mongoose;

    // set app acl
    app.acl = new acl( new acl.mongodbBackend(mongoose.connection.db, 'acl_', true) ); // useSingle: true

    return Acl;

};