(function() {
  'use strict';
// Plugins
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
$.browserSync = require('browser-sync');
$.runSequence = require('run-sequence');
$.del = require('del');
$.eventStream = require('event-stream');
$.path = require('path');

// AWS config, override environment variables in .awsconfig.json
var awsconfig = {};
try {
  awsconfig = require('./.awsconfig.json');
/*eslint-disable no-empty */
} catch (e) { }
/*eslint-enable no-empty */

var aws = {
  'accessKeyId': awsconfig.ACCESS_KEY_ID ? awsconfig.ACCESS_KEY_ID : process.env.AWS_ACCESS_KEY_ID,
  'secretAccessKey': awsconfig.SECRET_ACCESS_KEY ? awsconfig.SECRET_ACCESS_KEY : process.env.AWS_SECRET_ACCESS_KEY,
  params: { 'Bucket': awsconfig.BUCKET ? awsconfig.BUCKET : process.env.AWS_BUCKET },
  'region': awsconfig.REGION ? awsconfig.DEFAULT_REGION : process.env.AWS_DEFAULT_REGION
};

// Directories
var dirs = {
  src: 'src',
  lib: 'lib',
  build: 'public',
  rev: 'rev'
};

// Error handler
var handleError = function(err) {
  console.log(err.toString());
  this.emit('end');
};

// config defaults
var config = {
  inDev: false,
  prettyJade: false,
  minifyCss: true,
  uglifyJs: true,
  magicDebug: false,
  deploy: process.argv[2] == 'deploy'
};


// when run as `gulp --dev`
if ($.util.env.dev) {
  config.inDev = true;
  config.prettyJade = true;
  config.minifyCss = false;
  config.uglifyJs = false;
  config.magicDebug = true;
}

if ($.util.env.magicDebug === 'false') {
  config.magicDebug = false;
}
if (process.env.GA === 'true') {
  config.ga = true;
}
else
  config.ga = config.deploy;



function contentTypeMiddleware(req, res, next) {
  if (req.url.match(/^[^.]+$/)) {
    res.setHeader('Content-Type', 'text/html');
  }
  next();
}

gulp.task('browser-sync', function() {
  $.browserSync({
    server: {
      baseDir: 'public',
      index: 'index.html'
    },
    middleware: contentTypeMiddleware
  });
});

gulp.task('watch', ['browser-sync'], function() {
  gulp.watch(dirs.src + '/js/*.js', ['scripts']);
  gulp.watch(dirs.src + '/css/*.scss', ['styles']);
  gulp.watch(dirs.src + '/templates/**/*.jade', ['templates']);
  gulp.watch(dirs.src + '/img/**/*.svg', ['svg']);
});

gulp.task('styles', function() {
  return gulp.src(dirs.src + '/css/*.scss')
    .pipe($.sass())
    .on('error', handleError)
    .pipe($.autoprefixer())
    .pipe($.if(config.minifyCss, $.minifyCss()))
    .pipe($.concat('all.css'))
    .pipe(gulp.dest(dirs.build + '/css'))
    .pipe($.browserSync.reload({ stream: true }))
    .pipe($.notify({ message: 'Styles task complete' }));
});

gulp.task('scripts', function() {
  var src = gulp.src([ dirs.src + '/js/**/*.js', 'node_modules/imager.js/dist/Imager.min.js']);
  if (!config.magicDebug) {
    src.pipe($.replace(/.addIndicators/g, '//.addIndicators'));
  }
  if (config.inDev) {
    src.pipe($.replace(/scene.loglevel = 0/g, 'scene.loglevel = 2'));
  }
  return src
    .pipe($.order([
      'vendor/jquery*.js',
      'vendor/bootstrap.min.js',
      'vendor/TweenMax*.js',
      'vendor/ScrollMagic*.js',
      'vendor/animation*.js',
      'vendor/checkout*.js',
      'Imager.min.js',
      'vendor/slick*.js',
      'main.js',
      'errors.js'
    ]))
    .pipe($.concat('main.js'))
    .pipe($.if(config.uglifyJs, $.uglify({ preserverComments: 'some' })))
    .pipe(gulp.dest(dirs.build + '/js'))
    .pipe($.browserSync.reload({ stream: true }))
    .pipe($.notify({ message: 'Scripts task complete' }));
});

gulp.task('svg', function() {
  return gulp.src(dirs.src + '/img/**/*.svg')
    .pipe($.svgmin({
      plugins: [{
        removeComments: false
      }, {
        cleanupIDs: false
      }, {
        convertShapeToPath: false
      }]
    }))
    .pipe(gulp.dest(dirs.build + '/img'))
    .pipe($.browserSync.reload({ stream: true }))
    .pipe($.notify({ message: 'SVG generated' }));
});

gulp.task('iconz', function(){
  var runTimestamp = Math.round(Date.now()/1000);
  return gulp.src(dirs.src + ['/img/bottle/*.svg'])
    .pipe($.iconfontCss({
      fontName: 'bottlefont',
      targetPath: '../../css/_bottle_icons.scss',
      fontPath: '/img/bottle/'
    }))
    .pipe($.iconfont({
      fontName: 'bottlefont', // required
      appendUnicode: true, // recommended option
      formats: ['ttf', 'eot', 'woff'], // default, 'woff2' and 'svg' are available
      timestamp: runTimestamp, // recommended to get consistent builds when watching files
    }))
    .pipe(gulp.dest(dirs.src + '/img/bottle'));
});

gulp.task('images', ['iconz'], function() {
  return gulp.src(dirs.src + '/img/**/*.{jpg,jpeg,png,eot,woff,ttf}')
    .pipe(gulp.dest(dirs.build + '/img'));
});

gulp.task('favicons', function() {
  return gulp.src(dirs.src + '/favicons/**/*')
    .pipe(gulp.dest(dirs.build));
});

gulp.task('videos', function() {
  return gulp.src(dirs.src + '/vid/*.mp4')
    .pipe(gulp.dest(dirs.build + '/vid'));
});

gulp.task('templates', function() {
  return gulp.src(dirs.src + '/templates/**/[^_]*.jade')
    .pipe($.if(!config.ga, $.replace(/ANALYTICS[\s\S]*ANALYTICS END/g, '')))
    // don't play the youtube videos while debugging
    .pipe($.if(config.inDev, $.replace(/autoplay=1/g, 'autoplay=0')))
    // convert '//' comments to '//-' comments so they don't get outputted to the html files
    .pipe($.replace(/\s\/\/[^-]/g, ' //-'))
    .pipe($.data(function(file) {
      return { currentPath: file.history[0].replace(file.base, '').replace('index.jade', '').replace('/', '') };
    }))
    .pipe($.jade({ pretty: config.prettyJade }))
    .on('error', handleError)
    .pipe($.rename({ extname: '.html' }))
    .pipe(gulp.dest(dirs.build))
    .pipe($.browserSync.reload({ stream: true }))
    .pipe($.notify({ message: 'Template generated' }));
});

gulp.task('rev', ['build'], function() {
  return gulp.src([dirs.build + '/css/*.css', dirs.build + '/js/*.js'], { base: $.path.join(process.cwd(), dirs.build) })
    .pipe($.rev())
    .pipe(gulp.dest(dirs.build))
    .pipe($.rev.manifest())
    .pipe(gulp.dest(dirs.rev));
});

gulp.task('rev-replace', ['rev'], function() {
  var manifest = gulp.src(dirs.rev + '/rev-manifest.json');

  return gulp.src([dirs.build + '/**/*.html'])
    .pipe($.revReplace({
      manifest: manifest,
      replaceInExtensions: [ '.html' ]
    }))
    .pipe(gulp.dest(dirs.build));
});

gulp.task('build', function(cb) {
  $.runSequence(
    ['clean'],
    ['styles', 'scripts', 'images', 'videos', 'favicons'],
    ['svg'],
    ['templates'],
    cb
  );
});

gulp.task('clean', function(cb) {
  $.del([dirs.build, './rev'], cb);
});

gulp.task('deploy', ['rev-replace'], function() {
  var publisher = $.awspublish.create(aws);
  var headers = {};

  return $.eventStream.concat(
    gulp.src(dirs.build + '/**/*')
        .pipe($.awspublishRouter({
            cache: { cacheTime: 300 },
            routes: {
              '^vid/(?:.+)\\.(?:mp4)$': {
                key: '$&',
                cacheTime: 630720000,
                'headers': {
                 'Content-Type': 'video/mp4;'
               }
              },
              '^css/(?:.+)\\.(?:css)$': {
                key: '$&',
                gzip: true,
                cacheTime: 630720000,
                'headers': {
                 'Content-Type': 'text/css'
               }
              },
              '^img/(?:.+)\\.(?:svg)$': {
                key: '$&',
                gzip: true,
                cacheTime: 630720000,
                'headers': {
                  'Content-Type': 'image/svg+xml'
                }
              },
              '^js/(?:.+)\\.(?:js)$': {
                  key: '$&',
                  gzip: true,
                  cacheTime: 630720000
              },
              '^img/(?:.+)\\.(?:jpg|png|jpeg)$': {
                  key: '$&',
                  gzip: true,
                  cacheTime: 630720000
              },
              '^.+\\.(?:html)$': {
                  key: '$&',
                  gzip: true
              },
              '^.+$': '$&'
            }
        }))
      .pipe(publisher.publish(headers, { force: true }))
      .pipe($.awspublish.reporter()));
});

gulp.task('default', function(cb) {
  $.runSequence(
    ['build'],
    ['watch'],
    cb
  );
});
}());


