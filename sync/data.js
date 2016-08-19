var async = require('async');
var dot   = require('dotty');
var fs    = require('fs');
var _     = require('underscore');

module.exports = function(app, loadCb) {

    var _log      = app.lib.logger;
    var _env      = app.get('env');
    var _schema   = app.lib.schema;
	var _mongoose = app.core.mongo.mongoose;
	var _c        = app.config[_env];
    var _group    = 'SYNC:DATA';
    var workerId  = app.get('workerid');
    
    if(workerId != 0) {
        loadCb();
        return false;        
    }

    // async object
    var a = {};

    /**
     * ----------------------------------------------------------------
     * get or save apps
     * ----------------------------------------------------------------
     */

    var apps = _c.apps.list;

    if(dot.get(_c, 'sync.data.apps')) {
        _.each(apps, function(value, key) {
            (function(a, value, key) {
                a['app_'+value.slug] = function(cb) {
                    var schema = new _schema('system.apps').init(app);

                    schema.get({slug: value.slug, qt: 'one'}, function(err, apps) {
                        if(err)
                            _log.error(_group+':APPS:GET', err);
                        
                        if( ! err && apps ) {
                            schema = null;
                            return cb(null, apps);
                        }

                        schema.post(value, function(err, apps) {
                            if(err)
                                _log.error(_group+':APPS:POST', err);
                            
                            schema = null;
                            cb(null, apps);
                        });
                    });
                };
            })(a, value, key);
        });
    }

    // auth middleware'de eğer kullanıcı yoksa user.id = 'guest' olarak set ediliyor,
    // user.id = 'guest' için guest role'ü set edilmeli
    function guestRole(role, currApp) {
        if(role.slug == 'guest') {
            app.acl.addUserRoles('guest', currApp.slug+'_guest');
            _log.info(_group+':GUEST:ACL:ADD_USER_ROLES', 'guest user acl created for '+currApp.name);
        }
    }

    // execute parallel
    async.parallel(a, function(err, apps) {
        _log.info(_group+':APPS', apps);

        // async object
        a = {};

        /**
         * ----------------------------------------------------------------
         * get or save roles
         * ----------------------------------------------------------------
         */

        if(dot.get(_c, 'sync.data.roles')) {
            _.each(_c.roles, function(value, key) {
                var currApp = apps['app_'+key];

                if( ! currApp )
                    return;

                var currId = currApp._id.toString(); // get app id
                var roles  = value.default;

                _.each(roles, function(role_value, role_key) {
                    (function(a, key, role_value, role_key, currId, currApp) {
                        a['role_'+key+'.'+role_value.slug] = function(cb) {
                            var schema = new _schema('system.roles').init(app);
                            guestRole(role_value, currApp);

                            schema.get({apps: currId, slug: role_value.slug, qt: 'one'}, function(err, role) {
                                if(err)
                                    _log.error(_group+':ROLES:GET', err);
                                
                                if( ! err && role ) {
                                    schema = null;
                                    return cb(null, role);
                                }

                                role_value.apps = currId;
                                schema.post(role_value, function(err, role) {
                                    if(err)
                                        _log.error(_group+':ROLES:POST', err);
                                    
                                    schema = null;
                                    cb(null, role);
                                });
                            });
                        };

                    })(a, key, role_value, role_key, currId, currApp);
                });
            });
        }

        /**
         * ----------------------------------------------------------------
         * collect model properties
         * ----------------------------------------------------------------
         */

        var collect = function(models, obj, mainKey) {
            _.each(models, function(value, key) {
                if( ! value.schema ) {
                    return collect(value, obj, key);
                }

                key = mainKey ? mainKey+'.'+key : key;

                if(mainKey)
                    value.appName = mainKey;

                obj[key] = value;
            });

            return obj;
        };

        var models = {};
        models = collect(app.model, models);

        /**
         * ----------------------------------------------------------------
         * get or save objects
         * ----------------------------------------------------------------
         */

        if(dot.get(_c, 'sync.data.objects')) {
            _.each(models, function(value, key) {
                // inspector eklenmemiş veya appName'i olmayan modelleri resource kabul etmiyoruz
                if( ! value.schema.inspector || ! value.appName ) {
                    _log.info(_group, 'inspector or app name not found, '+key);
                    return;
                }

                var currApp = apps['app_'+value.appName];


                // console.log("========------------------")
                // console.log(apps)
                // console.log(value.appName)
               // console.log(models)

                if( ! currApp ) {
                    _log.info(_group, 'curr app not found, '+key);
                    return;
                }

                // get app id
                var currId = currApp._id.toString();

                (function(a, value, key, currId) {
                    a['object_'+key] = function(cb) {
                        var schema = new _schema('system.objects').init(app);
                        var plural = dot.get(value.schema, 'inspector.Options.plural');

                        schema.get({apps: currId, slug: key, qt: 'one'}, function(err, object) {
                            if(err)
                                _log.error(_group+':OBJECTS:GET', err);
                            
                            if( ! err && object ) {
                                schema = plural = null;
                                return cb(null, object);
                            }

                            schema.post({apps: currId, name: plural || key, slug: key}, function(err, object) {
                                if(err)
                                    _log.error(_group+':OBJECTS:POST', err);
                                
                                schema = plural = null;
                                cb(null, object);
                            });
                        });
                    };
                })(a, value, key, currId);
            });
        }

        // execute parallel
        async.parallel(a, function(err, results) {
            _log.info(_group+':RESULTS', 'listing...');
            // console.log(results);
            
            var series = {};

            /**
             * ----------------------------------------------------------------
             * create superadmin user
             * ----------------------------------------------------------------
             */

            if(dot.get(_c, 'sync.data.superadmin')) {
                series['superadmin'] = function(cb) {
                    // superadmin sistem app kullanıcısı olarak kaydedilecek
                    // (superadmin tüm object'ler için full acl izinlerine sahip)
                    var currApp = apps['app_system'];

                    if( ! currApp )
                        return cb();

                    // get app id
                    var currId = currApp._id.toString();
                    var schema = new _schema('system.users').init(app);

                    // users modelinde superadmin role'üne izin vermediğimiz için burda ekliyoruz
                    schema.get({email: _c.api.admin.user.email, qt: 'one'}, function(err, user) {
                        if( ! err && user ) {
                            schema = null;
                            app.acl.addUserRoles(user._id.toString(), 'superadmin');
                            _log.info(_group+':GUEST:ACL:ADD_USER_ROLES', 'superadmin user acl created for '+currApp.name);
                            return cb(err, user);
                        }

                        // set role id
                        _c.api.admin.user.roles = results['role_system.superadmin']._id.toString(); // get role id

                        schema.post(_c.api.admin.user, function(err, user) {
                            if(user) {
                                app.acl.addUserRoles(user._id.toString(), 'superadmin');
                                _log.info(_group+':GUEST:ACL:ADD_USER_ROLES', 'superadmin user acl created for '+currApp.name);
                            }

                            schema = null;
                            cb(err, user);
                        });
                    });
                };
            }

            /**
             * ----------------------------------------------------------------
             * create actions
             * ----------------------------------------------------------------
             */

            if(dot.get(_c, 'sync.data.actions')) {
                var masterData = ['get*', 'post*', 'put*', 'delete*'];
                var master;

                series['actions'] = function(cb) {
                    _.each(_c.roles, function(value, key) {
                        var currApp = apps['app_'+key];

                        if( ! currApp )
                            return;

                        // get app id
                        var currId = currApp._id.toString();

                        // roles
                        var actions = value.actions;

                        _.each(actions, function(act_value, act_key) {
                            var role = results['role_'+key+'.'+act_key]._id.toString();

                            _.each(act_value, function(action, object) {
                                object = results['object_'+object]._id.toString();

                                // collect master actions
                                master = [];
                                var cAction = _.clone(action);
                                _.each(cAction, function(actVal, actKey) {
                                    // actVal: get, get* gibi geliyor
                                    _.each(masterData, function(mVal, mKey) {
                                        // mVal: get*, post*, put*, delete*
                                        if(actVal == mVal) {
                                            var index = action.indexOf(actVal);
                                            if (index > -1)
                                                action.splice(index, 1);

                                            master.push(mVal);
                                        }
                                    });
                                });

                                /**
                                 * eğer izinler daha önceden kaydedilmişse üzerine ek yapabilmek veya çıkarmak için önce izni kontrol et
                                 */

                                (function(currId, role, object, master, action) {
                                    var mAction = new _schema('system.actions').init(app);

                                    mAction.get({
                                        apps    : currId,
                                        roles   : role,
                                        objects : object,
                                        qt      : 'one'
                                    },
                                    function(err, currAction) {
                                        if(currAction) {
                                            mAction.put(currAction._id.toString(), {action: action, master: master}, function(err, affected) {
                                                // if(err)
                                                //    _log.info(err);

                                                if( ! err && affected )
                                                    _log.info(_group+':ACTION:UPDATED', currAction._id.toString());

                                                mAction = null;
                                            });

                                            return;
                                        }

                                        var obj = {
                                            apps    : currId,
                                            roles   : role,
                                            objects : object,
                                            master  : master,
                                            action  : action
                                        };

                                        mAction.post(obj, function(err, action) {
                                            // if(err)
                                            //    _log.info(err);

                                            if( ! err && action )
                                                _log.info(_group+':ACTION:CREATED', action._id.toString());

                                            mAction = null;
                                        });
                                    });
                                })(currId, role, object, master, action);
                            });
                        });
                    });

                    cb(null, 'processing...');
                };
            }

            /**
             * ----------------------------------------------------------------
             * sync user roles
             * ----------------------------------------------------------------
             */

            if(dot.get(_c, 'sync.data.userroles')) {

                series['userroles'] = function(cb) {
                    var schema = new _schema('system.users').init(app);

                    schema.stream({limit: 100000}, function(err, users) {

                        users.on('data', function (user) {

                            /**
                             * @TODO
                             * fazla sayıda kullanıcı olması durumunda burasının kuyrukta çalışması gerekecek
                             */
                            new app.lib.user(app).addRole(user);

                        }).on('error', function (err) {
                            _log.error(_group, err);
                        }).on('end', function () {
                            _log.info(_group, 'user roles sync stream end');
                        });

                    });
	                
	                cb();
                };

            }

            /**
             * ----------------------------------------------------------------
             * sync model documentation
             * ----------------------------------------------------------------
             */

            if(dot.get(_c, 'sync.data.docs')) {

                series['docs'] = function(cb) {
                    new app.lib.apidocs.index(app, cb);
                };

            }

            /**
             * ----------------------------------------------------------------
             * sync user apps
             * ----------------------------------------------------------------
             */

            var usersApp = dot.get(_c, 'sync.fill_users_apps');
            
            if(usersApp) {

                series['userapps'] = function(cb) {
                    
                    _.each(usersApp, function(status, model) {
                        if( ! status )
                            return;
                        
                        (function(model, schema, app, mongoose) {
                            var m = new schema(model).err().init(app);

	                        if( ! m )
	                            return false;
	                        
                            m.stream({limit: 100000}, function(err, profiles) {

	                            var Users = mongoose.model('System_Users');
	                            
                                profiles.on('data', function (profile) {
                
	                                if( ! profile || ! profile.u || ! profile.ap )
	                                    return;

	                                Users.update({_id: profile.u}, {$addToSet: {ap: profile.ap}}, {}, function(err, raw) {});
                
                                }).on('error', function (err) {
                                    _log.error(_group, err);
                                }).on('end', function () {
                                    _log.info(_group, model+' sync stream end');
                                });

                            });                            
                        })(model, _schema, app, _mongoose);
                    });
	                
	                cb();
                };

            }
            
            /**
             * ----------------------------------------------------------------
             * execute series
             * ----------------------------------------------------------------
             */

            async.series(series, function(err, results) {
                if(err)
                    return _log.error(_group, err);

                _log.info(_group+':SERIES:RESULTS', 'listing...');
                // console.log(results);
                
                if(Object.keys(results).length)
                    _log.info(_group, 'sync data executed!');
                
                setTimeout(function() {
                    loadCb();     
                }, 1000);
            });

        });

    });

};
