import Purest from 'purest';

class Twitter {
    constructor(opts) {
        this._opts = opts || {};
        this._opts.provider = 'twitter';
        this._purest = new Purest(this._opts);
        this._group = 'LIB:SOCIAL:TWITTER';

        return this;
    }

    user(cb) {

    }

    post(form, cb) {
        // form = {status: 'status message'}

        this._purest.post('statuses/update', {
            oauth:{
                consumer_key: this._opts.auth.key,
                consumer_secret: this._opts.auth.secret,
                token: this._opts.auth.token,
                token_secret: this._opts.auth.token_secret
            },
            form: form
        },
        (err, res, body) => {
            if (err) {
                console.log(err);
                return cb(err);
            }

            cb(null, body);
        })

    }
}

export default function(app) {
    return Twitter;
};

