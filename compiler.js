const
  fs = require('fs'),
  path = require('path'),
  htmlmin = require('html-minifier'),
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

compiler.replaceFileExtension = (filename, extension) => {
  const i = filename.indexOf('.');
  return `${(i < 0) ? filename : filename.substr(0, i)}.${extension}`;
}

compiler.compileAtomaticFiles = (files) => {

  return files
    .filter(({filename}) => minimatch(path.basename(filename), compiler.matchPattern))
    .map((file) => {

      const
        {filename, componentName, extension, data, timestamp} = file,
        atomaticFile = path.join(compiler.path, `${componentName}.js`),
        hash = objectHash.MD5({componentName, browserify: true});

      if (!file._lastBrowserify || file._lastBrowserify < timestamp) {
        const {source, locals} = compiler.compileFile({
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

        const jsFilename = compiler.replaceFileExtension(filename, 'js');

        fs.writeFileSync(atomaticFile, [
          fs.existsSync(jsFilename) ? fs.readFileSync(jsFilename, 'utf8') : '',
          `const __template = ${JSON.stringify(htmlmin.minify(source))};`,
          `const __mockData = ${JSON.stringify(locals)};`,
          `export { __template as template, __mockData as mockData };`
        ].join('\n'));

        file._lastBrowserify = timestamp;
      }

      return file;
    });
};

compiler.compile = (content, cb) => {
  compiler.compiledAtomaticFiles.map(({componentName}) => {

    const
      cleanedComponentName = path.basename(componentName, path.extname(componentName)),
      regex = new RegExp(`(\'|\")+(${cleanedComponentName})(\'|\")+`, 'g'),
      value = `$1${compiler.path}/${componentName}.js$3`;

    content = content.replace(regex, value);
  });

  cb(null, content)
};
