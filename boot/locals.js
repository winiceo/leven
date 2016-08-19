export default function(app) {

    const _log   = app.lib.logger;
    const _group = 'BOOT:LOCALS';

    try {
        const _env = app.get('env');

        app.use((req, res, next) => {
            res.locals.req      = req;
            res.locals.res      = res;
            res.locals.segments = req.url.split('/');
            res.locals.env      = _env;
            res.locals.config   = app.config[_env];
            res.locals.now      = Date.now();

            if(app.boot.session)
                res.locals.session = req.session;

            if(app.boot.flash)
                res.locals.flash = req.flash('flash');

            next();
        });

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




