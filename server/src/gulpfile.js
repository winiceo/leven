var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');

var pm2=require("pm2");
var path = require('path');

var paths = {
    es6: ['route/**/*.js','app/**/*.js','model/**/*.js',"kevio/**/*.js"],
    es5: 'genv',
    // Must be absolute or relative to source map
    sourceRoot: path.join(__dirname, 'es6'),
};
gulp.task('babel', function () { // (A)
    return gulp.src(paths.es6)
        .pipe(sourcemaps.init()) // (B)
        .pipe(babel())
        .pipe(sourcemaps.write('.', // (C)
            { sourceRoot: paths.sourceRoot }))
        .pipe(gulp.dest(paths.es5));
});

gulp.task('pm2', function(cb) {
    pm2.connect(function() {
        pm2.restart('kevio', function() {
            return cb()
        })
    })
})


gulp.task('dev:server', function () {
    pm2.connect(true, function () {
        pm2.start({
            name: 'kevio',
            script: './es5/index.js',
            env: {

            }
        }, function () {
            console.log('pm2 started');
            pm2.streamLogs('all', 0);
        });
    });
});


gulp.task('watch', function() { // (D)
    gulp.watch(paths.es6, ['babel','pm2']);
});
gulp.task('default', ['dev:server','watch']); // (E)