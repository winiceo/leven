import crypto from 'crypto';
import mask from 'json-mask';
import jwt from 'jwt-simple';
import _ from 'underscore';

// speed up calls
const toString = Object.prototype.toString;

class Helper {
    constructor(app) {
        this._app = app;

        // slugs for validation messages
        this._slugs = {
            required: 'required_error',
            email: 'email_error'
        };

        String.prototype.trToUpper = function() {
            let string = this;
            const letters = { "i": "İ", "ş": "Ş", "ğ": "Ğ", "ü": "Ü", "ö": "Ö", "ç": "Ç", "ı": "I" };
            string = string.replace(/(([iışğüçö]))/g, letter => letters[letter]);
            return string.toUpperCase();
        };

        String.prototype.trToLower = function() {
            let string = this;
            const letters = { "İ": "i", "I": "ı", "Ş": "ş", "Ğ": "ğ", "Ü": "ü", "Ö": "ö", "Ç": "ç" };
            string = string.replace(/(([İIŞĞÜÇÖ]))/g, letter => letters[letter]);
            return string.toLowerCase();
        };

        String.prototype.trTitleize = function() {
            const words = this.split(' ');
            const array = [];
            for (let i=0; i<words.length; ++i) {
                array.push(words[i].charAt(0).trToUpper() + words[i].toLowerCase().slice(1))
            }
            return array.join(' ');
        };
    }

    type(value) {
        return toString.call(value);
    }

    hash(passwd, salt) {
        return crypto.createHmac('sha256', salt).update(passwd).digest('hex');
    }

    random(len) {
        return crypto.randomBytes(Math.ceil(len/2))
            .toString('hex') // convert to hexadecimal format
            .slice(0, len); // return required number of characters
    }

    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    mapToString(value) {
        return _.map(value, obj => obj.toString());
    }

    expiresIn(numDays) {
        const date = new Date();
        return date.setDate(date.getDate()+numDays);
    }

    genToken(user, secret, days) {
        const expires = this.expiresIn(days);
        const token   = jwt.encode({exp: expires, user: user}, secret);

        return {
            token: token,
            expires: expires
        };
    }

    daysLater(numDays) {
        return Date.now()+(3600000*24*numDays);
    }

    mask(obj, fields) {
        return mask(obj, fields)
    }

    schemaAliases(schema) {
        schema = _.clone(schema);
        schema = _.map(schema, (value, key) => value.alias || value[0].alias);

        // prepend _id field
        schema.unshift('_id');
        
        return schema;
    }

    bodyErrors(errors, next) {
        const self   = this;
        this._http = this._app.system.response ? this._app.system.response.app : false;

        const resp = {
            type: 'ValidationError',
            errors: []
        };

        _.each(errors, (value, key) => {
            if(self.type(value == '[object Array]')) {
                _.each(value, (v, k) => {
                    resp.errors.push({path: key, slug: v});
                });
            }
            else
                resp.errors.push({path: key, slug: value});
        });

        return (next && this._http) ? next(this._http.UnprocessableEntity(resp)) : resp.errors;
    }
}

export default function(app) {
    return new Helper(app);
};
