import async from 'async';
import dot from 'dotty';
import php from 'phpjs';
import _ from 'underscore';

// speed up calls
const toString = Object.prototype.toString;

class Denormalize {
    constructor(app) {
        this._app      = app;
        this._log      = app.lib.logger;
        this._mongoose = app.core.mongo.mongoose;
        this._models   = {};

        return this;
    }

    /**
     * ----------------------------------------------------------------
     * Denormalize Process
     * ----------------------------------------------------------------
     */

    process(doc, inspector, cb) {
        const self   = this;
        const save   = inspector.Save;
        const denorm = inspector.Denorm;
        const alias  = inspector.Alias;
        const vals   = {};
        const a      = [];

        /**
         * return yaparken cb()'yi çağırmayı unutma
         */
        
        if( ! denorm ) {
            console.log('denormalize.process inspector.Denorm not found')
            return cb();
        }

        // _dismissHook değişkeni geldiğinde denormalization çalıştırılmayacak
        if(doc.__dismissHook)
            return cb();
        
        // collect ids for references
        _.each(save.properties, (value, key) => {
            if(value.ref && denorm[value.ref]) {
                if( ! vals[value.ref] )
                    vals[value.ref] = [];

                if(doc[key]) {
                    if(toString.call(doc[key]) == '[object Array]') {
                        _.each(doc[key], kV => {
                            if(kV) {
                                if(toString.call(kV.toString) == '[object Function]')
                                    kV = kV.toString();

                                vals[value.ref].push(kV);	                        
                            }
                        });
                    }
                    else
                        vals[value.ref].push(doc[key]);
                }
            }
        });

        // query references with unique ids
        _.each(vals, (value, key) => {
            value = _.uniq(value);

            (((a, model, doc, value, mongoose, denorm, alias) => {
                if( ! denorm[model] )
                    return console.log('denormalize.process inspector.Denorm[model] not found');

                let target  = _.clone(denorm[model].target);
                let targets = denorm[model].targets;
                let fields  = _.clone(denorm[model].fields);

                if( ! target && ! targets ) {
                    if( ! target )
                        console.log('denormalize.process inspector.Denorm[model].target not found');

                    if( ! targets )
                        console.log('denormalize.process inspector.Denorm[model].targets not found');

                    return;
                }

                /* TARGET */
                if(alias[target])
                    target = alias[target];

                if( ! doc[target] )
                    doc[target] = {};

                // mixed ve date field'larda modified olarak işaretlenmezse denormalize worker'ları çalıştığında güncellemiyor
                // (target field'ı data_profiles vs gibi her zaman mixed olarak belirtiliyor)
                if(target) // ör: d_p => data_profiles
                    doc.markModified(target);

                /* TARGETS */
                if(targets) {
                    const tMain = _.clone(targets.source);
                    targets   = _.clone(targets.fields);

                    // change alias for target fields
                    _.each(targets, (tSource, tTarget) => {
                        if(alias[tTarget])
                            targets[alias[tTarget]] = tSource;

                        /**
                         * @TODO
                         * tTarget ve alias[tTarget]'in eşit olması durumunda silinmeyecek
                         */
                        delete targets[tTarget];
                    });
                }

                // model
                const m      = mongoose.model(model);
                const mAlias = dot.get(m.schema, 'inspector.Alias');
                fields     = fields ? fields.split(',') : [];

                if(mAlias) {
                    _.each(fields, (field, index) => {
                        if(mAlias[field])
                            fields[index] = mAlias[field];
                    });

                    // change alias for source fields
                    _.each(targets, (tSource, tTarget) => {
                        if(mAlias[tSource]) {
                            targets[tTarget] = mAlias[tSource];
                            fields.push(mAlias[tSource]);
                        }
                    });
                }

                if(fields.length)
                    fields = _.uniq(fields);

                a.push(cb => {
                    try {
                        if( ! value || ! value.length )
                            return cb();
                        
                        m.find({_id: {$in: value}}, fields.join(' '), (err, data) => {
                            if(data) {
                                if(target) {
                                    _.each(data, (dVal, dKey) => {
                                        doc[target][dVal._id.toString()] = dVal;
                                    });
                                }

                                // targets sadece tekil field'lar için denormalize edilecek, target field type=array kontrolü koy
                                if(targets && data.length == 1) {
                                    _.each(targets, (tSource, tTarget) => {
                                        if(data[0] && data[0][tSource])
                                            doc[tTarget] = data[0][tSource];
                                    });
                                }
                            }

                            cb(null, data);
                        });
                    }
                    catch(e) {
                        console.log(e);
                        cb(null);
                    }
                });
            }))(a, key, doc, value, self._mongoose, denorm, alias);
        });

        async.parallel(a, (err, results) => {
            cb();
        });
    }

    /**
     * ----------------------------------------------------------------
     * Denormalize Touch
     * ----------------------------------------------------------------
     */

    touch(data, inspector) {
        const self   = this;
        const save   = inspector.Save;
        const name   = inspector.Name;
        const denorm = inspector.Denorm;
        const alias  = inspector.Alias;
        const source = data.source;
        const doc    = data.doc;
        let group  = 'DENORMALIZE:TOUCH';

        if( ! name )
            return console.log('denormalize.touch inspector.Name not found');
        else if( ! denorm )
            return console.log('denormalize.touch inspector.Denorm not found');
        else if( ! source )
            return console.log('denormalize.touch data.source not found');
        else if( ! doc )
            return console.log('denormalize.touch data.doc not found');

        if(denorm[source]) {
            let fields  = _.clone(denorm[source].fields);
            let target  = _.clone(denorm[source].target);
            let targets = denorm[source].targets;
            const docId   = doc._id.toString();
            const updates = {$set: {}};
            let cond    = {};
            group += ':'+name+':_from_:'+source+':'+docId;
            fields = fields ? fields.split(',') : [];

            if(alias[target])
                target = alias[target];

            // change alias for target fields
            if(targets) {
                let tMain = _.clone(targets.source);
                targets   = _.clone(targets.fields);

                _.each(targets, (tSource, tTarget) => {
                    if(alias[tTarget])
                        targets[alias[tTarget]] = tSource;

                    /**
                     * @TODO
                     * tTarget ve alias[tTarget]'in eşit olması durumunda silinmeyecek
                     */
                    delete targets[tTarget];
                });

                if(alias[tMain])
                    tMain = alias[tMain];
            }

            // direkt obje şeklinde set etmeye kalkarsak komple denormalize objesini elimizdeki data ile replace eder
            // bu yüzden dot notation şeklinde update edeceğiz (field._id.sub_field = value)
            const updateKey = target+'.'+docId;

            // set update condition
            cond[target+'.'+docId] = {$exists: true};

            // get mongoose doc
            const _doc = dot.get(data, 'doc._doc');

            if(_doc) {
                // source model
                const sModel = self._mongoose.model(source);
                const sAlias = dot.get(sModel.schema, 'inspector.Alias');

                if(sAlias) {
                    _.each(fields, (field, index) => {
                        if(sAlias[field])
                            fields[index] = sAlias[field];
                    });

                    // change alias for source fields
                    _.each(targets, (tSource, tTarget) => {
                        if(sAlias[tSource])
                            targets[tTarget] = sAlias[tSource];
                    });
                }

                _.each(_doc, (value, key) => {
                    /**
                     * @TODO
                     * mixed ve date field'lar modified olarak gelmeyebilir, bu durum test edilecek
                     */
                    if( doc._isModified && ! doc._isModified[key] )
                        return false;
                    
                    if(fields.indexOf(key) != -1)
                        updates.$set[updateKey+'.'+key] = value;
                });

                // targets sadece tekil field'lar için denormalize edilecek, target field type=array kontrolü koy
                if(targets) {
                    _.each(targets, (tSource, tTarget) => {
                        if(_doc && _doc[tSource])
                            updates.$set[tTarget] = _doc[tSource];
                    });
                }

                // override condition if only targets exists
                if( targets && ! target ) {
                    cond = {};
                    cond[tMain] = docId;
                }

                // eğer $set objesi boş gelmişse işlem yapma
                if( ! Object.keys(updates.$set).length )
                    return false;

                // update model
                const model = self._mongoose.model(name);
                
                model.update(cond, updates, {multi: true}, (err, affected, raw) => {
                    if(err)
                        return self._log.error(group+':UPDATE', err);

                    self._log.info(group+':AFFECTED', affected);
                });
            }
        }
    }

    /**
     * ----------------------------------------------------------------
     * Denormalize Size (count array size)
     * ----------------------------------------------------------------
     */

    size(doc, inspector) {
        // set doc
        const Doc   = doc.doc; // data şu şekilde geliyor => {source: 'Model_Name', doc: doc}
        const self  = this;
        const name  = inspector.Name;
        const size  = inspector.Size;
        const alias = inspector.Alias;
        const group = 'DENORMALIZE:SIZE';
        let clone;
        const update = {$set: {}};

        if( ! name )
            return console.log('denormalize.size inspector.Name not found');
        else if( ! size )
            return console.log('denormalize.size inspector.Size not found');

        // update model
        const docId   = Doc._id.toString();
        const model   = self._mongoose.model(name);
        const aggr    = [];
        const match   = {$match: {_id: self._mongoose.Types.ObjectId(docId)}};
        const project = {$project: {}};

        _.each(size, (value, key) => {
            if(alias[value])
                value = alias[value];

            if(alias[key])
                key = alias[key];

            // eğer modifiye edilmediyse size almıyoruz
            if( Doc._isModified && ! Doc._isModified[key] )
                return false;
            
            project.$project[value] = {$size: '$'+key};
        });

        // eğer $project objesi boş gelmişse işlem yapma
        if( ! Object.keys(project.$project).length )
            return false;

        aggr.push(match);
        aggr.push(project);

        model.aggregate(aggr, (err, result) => {
            if(err)
                return self._log.error(group, err);

            if( ! result[0] )
                return self._log.error(group+':RESULT', result);

            result = result[0];
            clone  = _.clone(result);
            delete clone._id;

            _.each(clone, (value, key) => {
                update.$set[key] = value;
            });

            model.update({_id: docId}, update, {}, (err, affected, raw) => {
                if(err)
                    return self._log.error(group+':UPDATE', err);

                self._log.info(group+':AFFECTED', affected);
            });
        });
    }

    sync(model, kue) {
        const self = this;

        if(self._app.get('isworker'))
            return console.log('denormalize start failed (because this is worker instance)')

        // update model
        const m = self._mongoose.model(model);
        const stream = m.find({}).stream({transform: transform});

        stream.on('data', doc => {

            console.log(model+' doc denormalize job: '+doc._id.toString());

            kue.create('denormalize-document', {
                title: 'Denormalize document',
                params: {
                    type: 'denormalize-document',
                    model: model,
                    id: doc._id.toString()
                }
            }).attempts(3).removeOnComplete(true).save();

        }).on('error', err => {
            console.error(err.stack);
        }).on('end', () => {
            console.log(model+' sync stream end');
        });

        return stream;
    }

    /**
     * @TODO
     * will be deprecated
     */

    fill(doc, fields, cb) {
        const self = this;
        let a    = [];

        _.each(fields, (value, key) => {
            // value: {ref: 'System_Users', source: 'u', fields: {una: 'n'}}

            (((a, doc, value) => {
                let m = self._mongoose.model(value.ref);

                a.push(cb => {
                    try {
                        m.findById(doc[value.source], (err, source) => {
                            if(source) {
                                _.each(value.fields, (fVal, fKey) => {
                                    /**
                                     * @TODO
                                     * sync etme işleminde ref alanlarında değer değişmeden save hook'larını çalıştırmak istiyoruz
                                     * o yüzden isNew veya isModified kontrolü yapma
                                     */
                                    // if(doc.isNew || doc.isModified(fKey))
                                    doc[fKey] = source[fVal];
                                });
                            }

                            m = null;
                            cb(null, source);
                        });
                    }
                    catch(e) {
                        console.log(e);
                        cb(null);
                    }
                });
            }))(a, doc, value);
        });

        async.parallel(a, (err, results) => {
            a = null;
            cb();
        });
    }

    /**
     * @TODO
     * will be deprecated
     */

    update(model, ref, doc, fields) {
        const self = this;

        // update model
        let m = self._mongoose.model(model);

        _.each(fields, (value, key) => {
            // value: {ref: 'System_Users', source: 'u', fields: {una: 'na'}}

            if(value.ref != ref)
                return;

            let cond = {}, updates = {};
            cond[value.source] = doc._id.toString();

            _.each(value.fields, (fVal, fKey) => {
                if(doc[fVal])
                    updates[fKey] = doc[fVal];
            });

            m.update(cond, updates, {multi: true}, err => {
                if(err)
                    console.log(err.stack);

                m = cond = updates = null;
            });
        });
    }

    /**
     * ----------------------------------------------------------------
     * Denormalize Count (increase or decrease other model's field)
     * ----------------------------------------------------------------
     */

    /**
     * @TODO
     * will be deprecated
     */

    count(original, doc, inspector) {
        const self  = this;
        const alias = inspector.Alias;
        const count = inspector.Count;
        const props = inspector.Save.properties;
        const a     = [];
        const group = 'DENORMALIZE:COUNT';
        original  = original || {};

        if( ! count )
            return console.log('denormalize.count inspector.Count not found');

        _.each(count, (target, source) => {
            if(alias[source])
                source = alias[source];

            if( ! doc[source] )
                return;

            if( ! props[source].ref )
                return;

            (((a, original, newest, mongoose, php, ref, target) => {
                original = original || [];
                newest   = newest || [];

                if(Object.prototype.toString.call(original) != '[object Array]')
                    original = [original];

                if(Object.prototype.toString.call(newest) != '[object Array]')
                    newest = [newest];

                original = _.map(original, obj => obj.toString());
                newest   = _.map(newest, obj => obj.toString());

                let newIds = php.array_diff(newest, original) || [];
                let oldIds = php.array_diff(original, newest) || [];
                const model  = mongoose.model(ref);
                const mAlias = dot.get(model.schema, 'inspector.Alias');

                if(mAlias && mAlias[target])
                    target = mAlias[target];

                newIds = _.map(newIds, obj => obj);
                oldIds = _.map(oldIds, obj => obj);

                if(newIds.length) {
                    const incr = {$inc: {}};
                    incr.$inc[target] = 1;
                    a.push(cb => {
                        model.update({_id: {$in: newIds}}, incr, {multi: true}, (err, raw) => {
                            if(err) {
                                self._log.error(group+':INCR', err);
                                return cb(null);
                            }

                            self._log.info(group+':INCR:AFFECTED', raw);
                            cb(null);
                        });
                    });
                }

                if(oldIds.length) {
                    const decr = {$inc: {}};
                    decr.$inc[target] = -1;
                    a.push(cb => {
                        model.update({_id: {$in: oldIds}}, decr, {multi: true}, (err, raw) => {
                            if(err) {
                                self._log.error(group+':DECR', err);
                                return cb(null);
                            }

                            self._log.info(group+':DECR:AFFECTED', raw);
                            cb(null);
                        });
                    });
                }
            }))(a, original[source], doc[source], self._mongoose, php, props[source].ref, target);
        });

        async.parallel(a, (err, results) => {

        });
    }
}

/**
 * ----------------------------------------------------------------
 * Denormalize Sync
 * ----------------------------------------------------------------
 */

function transform(doc) {
    return doc;
}

export default function(app) {
    return new Denormalize(app);
};

