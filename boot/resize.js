import mkdirp from 'mkdirp';
import path from 'path';
import mime from 'mime';
import dot from 'dotty';
import fs from 'fs';

export default function(app) {

    const _log    = app.lib.logger;
    const _env    = app.get('env');
    const _group  = 'BOOT:RESIZE';
    const _resize = app.config[_env].resize;
    
    try {
        const target = ['local', 's3', 'cloudinary'];
        const conf   = dot.get(app.config[_env], 'app.config.upload') || app.config[_env].upload;

        if( ! conf ) {
            _log.info(_group, 'upload conf not found');
            return;
        }

        const type = conf.type;

        if( target.indexOf(type) == -1) {
            _log.info(_group, 'upload type not found');
            return;
        }

        process.env['DEFAULT_SOURCE']     = type;
        process.env['CACHE_DEV_REQUESTS'] = true;
        process.env['IMAGE_QUALITY']      = 100;

        if(type == 'local')
            process.env['LOCAL_FILE_PATH'] = app.get('basedir')+'/public';

        if(type == 's3') {
            process.env['AWS_ACCESS_KEY_ID']     = conf.account.key;
            process.env['AWS_SECRET_ACCESS_KEY'] = conf.account.secret;
            process.env['S3_BUCKET']             = conf.bucket;
        }

        const ir      = require('image-resizer-tmp');
        const env     = ir.env;
        const Img     = ir.img;
        const streams = ir.streams;

        function forwards(req, res, next) {
            const url = req.url.split('/_i/');

            if(url.length > 1) {
                req.url  = '/'+url[1];
                let size = url[1].split('/');
                
                if(size && size.length) {
                    // development için izin ver
                    if(_env == 'development')
                        return next('route');
                    
                    size = size[0];
                    
                    if(_resize) {
                        if( ! _resize[req.hostname] ) {
                            _log.error(_group, 'not found hostname');
                            return res.status(404).end();                            
                        }
                        
                        if( _resize[req.hostname].indexOf(size) == -1 ) {
                            _log.error(_group, 'not allowed image size');
                            return res.status(404).end();
                        }
                    }
                }
            }

            /**
             * @TODO
             * burası hep en sonda olacağından eğer /_i/ mevcut değilse hata dön
             */
            
            next('route');
        }

        function expiresIn(maxAge) {
            let dt = Date.now();
            dt += maxAge * 1000;

            return (new Date(dt)).toGMTString();
        };

        // image expire time
        const expiry = 60*60*24*90;
        
        app.get('*', forwards);
        app.get('/*?', (req, res, next) => {
            const image = new Img(req, res);
            const file  = '/tmp'+req.path;

            /**
             * @TODO
             * bütün bu işlemleri redis-lock ile kilitle,
             * aynı imajı almaya çalışan beklesin, eğer ikinci requestte imaj varsa bulur ve gönderir
             * daha sonraki request'ler zaten nginx üzerinden alır
             */
            
            // check file
            fs.stat(file, (err, stat) => {
                if(stat && stat.isFile()) {
                    _log.info(_group+':FROM:CACHE', req.path);
                    
                    fs.readFile(file, (err, data) => {
                        if( err || ! data )
                            return res.status(404).end();

                        // set cache
                        res.set({
                            'Cache-Control':  'public',
                            'Expires':        expiresIn(expiry),
                            'Last-Modified':  (new Date(1000)).toGMTString(),
                            'Vary':           'Accept-Encoding'
                        });
                        
                        // set type and send response
                        const lookup = mime.lookup(file);
                        res.type(lookup || 'text/plain');
                        res.status(200).send(data);
                    });
                }
                else {
                    _log.info(_group+':FROM:'+type, req.path);
                    
                    image.getFile()
                        .pipe(new streams.identify())
                        .pipe(new streams.resize())
                        .pipe(new streams.filter())
                        .pipe(new streams.optimize())
                        .pipe(streams.response(req, res));
                }
            });
        });

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




