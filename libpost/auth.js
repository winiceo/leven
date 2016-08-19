import async from 'async';
import dot from 'dotty';
import _ from 'underscore';

class LibpostAuth {
    constructor(app) {
        this._app       = app;
        this._env       = app.get('env');
        this._conf      = app.config[this._env].api;
        this._log       = app.lib.logger;
        this._async     = app.lib.async;
        this._schema    = app.lib.schema;
        this._helper    = app.lib.utils.helper;
        this._mailer    = app.lib.mailer;

        return this;
    }

    userProfile(userId, appSlug, cb) {
        const self = this;

        const a = {
            resources: self._async.aclResources(userId)
        };

        // get user profile
        if(dot.get(self._app.model, appSlug+'.profiles')) {
            a.profile = cb => {
                new self._schema(appSlug+'.profiles').init(self._app).get({users: userId, qt: 'one'}, (err, doc) => {
                    cb(null, doc);
                });
            }
        }

        async.parallel(a, (err, results) => {
            cb(err, results);
        });
    }

    userData(userData, appSlug, res, tokenDisabled) {
        const self   = this;
        const userId = userData._id;
        const tConf  = self._conf.token;
        const _resp  = self._app.system.response.app;

        this.userProfile(userId, appSlug, (err, results) => {
            const data = {_id: userId};

            if(results.profile)
                data.profile = results.profile._id.toString();

            const token = tokenDisabled ? {} : self._helper.genToken(data, tConf.secret, tConf.expires);

            token.userId    = userId;
            token.name      = dot.get(results, 'profile.name') || userData.name;
            token.roles     = results.resources.roles || {};
            token.resources = results.resources.resources || {};
            token.profile   = false;
            
            if(results.profile) token.profile = results.profile;
            if(userData.last_login) token.lastLogin = userData.last_login;
            if(userData.is_enabled) token.isEnabled = userData.is_enabled;
            if(userData.waiting_status) token.waitingStatus = userData.waiting_status;
            if(userData.password_changed) token.passwordChanged = userData.password_changed;
            if(userData.password_changed_at) token.passwordChangedAt = userData.password_changed_at;
            
            _resp.OK(token, res);

            // update last login
            new self._schema('system.users').init(self._app).put(userId, {last_login: Date.now()}, (err, affected) => {});
        });
    }

    emailTemplate(name, appSlug, token, toEmail, group, cb) {
        const self  = this;
        const mConf = dot.get(self._app.config[self._env], 'app.mail.'+appSlug) ||
                    dot.get(self._app.config[self._env], 'mail.'+appSlug);

        /**
         * @TODO
         * callback ile hataları dön
         */
            
        // set transport
        const _transport = self._app.boot.mailer[appSlug] || self._app.boot.mailer;

        if(mConf) {
            const mailObj = _.clone(mConf[name]) || {};

            self._app.render(appSlug+'/email/templates/'+name, {
                baseUrl  : mConf.baseUrl,
                endpoint : mConf.endpoints[name],
                token    : token
            }, (err, html) => {
                if(err)
                    self._log.error(group, err);

                if(html) {
                    mailObj.to   = toEmail;
                    mailObj.html = html;

                    self._log.info(group+':MAIL_OBJ', mailObj);

                    new self._mailer(_transport).send(mailObj);
                }
            });
        }
        else
            self._log.info(group+':MAIL_OBJ', 'not found');

        cb();
    }

    userAcl(userId, objects, cb) {
        if(this._helper.type(objects) != '[object Array]')
            objects = [objects];
        
        _.each(objects, (value, key) => {
            objects[key] = value.replace('.', '_');
        });
        
        this._app.acl.allowedPermissions(userId, objects, (err, results) => {
            cb(err, results);
        });
    }
}

export default function(app) {
    return new LibpostAuth(app);
};
