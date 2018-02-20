const
  fs = require('fs'),
  path = require('path'),
  minimatch = require('minimatch'),
  objectHash = require('object-hash'),
  Emitter = require('events').EventEmitter;

let hasBabel = true;

try {
  require('babel-core');
} catch (e) {
  hasBabel = false;
}

const compiler = module.exports = new Emitter();

compiler.setMaxListeners(Infinity);

compiler.compileAtomaticFiles = (files) => {

  return files
    .filter(({filename}) => minimatch(path.basename(filename), compiler.matchPattern))
    .map((file) => {

      const
        {filename, componentName, extension, data, timestamp} = file,
        atomaticFile = path.join(compiler.path, componentName + '.atomatic'),
        hash = objectHash.MD5({componentName, browserify: true});

      if (!file._lastBrowserify || file._lastBrowserify < timestamp) {
        const {source: template, locals} = compiler.compileFile({
            filename,
            componentName,
            extension,
            data,
            hash,
            timestamp,
            saveHtml: null,
            saveLocals: null,
            renderHook: null
          },
          compiler.global, false);
        fs.writeFileSync(atomaticFile, JSON.stringify({template, locals}, null, 2));

        file._lastBrowserify = timestamp;
      }

      return componentName;
    });
};

compiler.compile = (content, cb) => {
  compiler.compiledAtomaticFiles.map(componentName => {
    const
      cleanedComponentName = path.basename(componentName, path.extname(componentName)),
      regex = new RegExp(`(\'|\")+(${cleanedComponentName})(\'|\")+`, 'g'),
      value = `$1${compiler.path}/${componentName}.atomatic$3`;

    content = content.replace(regex, value);
  });

  cb(null, content)
};
