const
  path = require('path'),
  fs = require('fs'),
  through = require('through'),
  htmlmin = require('html-minifier'),
  atomatic = require('atomatic'),
  compiler = require('./compiler');

function createDir(targetPath) {

  targetPath.split(path.sep)
    .reduce((parentDir, childDir) => {
      const curDir = path.resolve(parentDir, childDir);
      if (!fs.existsSync(curDir)) {
        fs.mkdirSync(curDir);
      }
      return curDir;
    }, path.isAbsolute(targetPath) ? path.sep : '');
}


function onJsFile(file) {

  let data = '';
  const stream = through(write, end);

  function dependency(file) {
    stream.emit('file', file);
  }

  function write(buf) {
    data += buf;
  }

  function end() {
    stream.emit('file', file);
    compiler.on('dependency', dependency);

    compiler.compile(data, (error, result) => {
      compiler.removeListener('dependency', dependency);
      if (error) {
        stream.emit('error', error);
        // browserify doesn't log the stack by default...
        console.error(error.stack.replace(/^.*?\n/, ''));
      }
      if (result) {
        stream.queue(result);
        stream.queue(null);
      }
    })
  }

  return stream;
}

function onAtomaticFile(filename, {_flags: opts = {}}) {

  let data = '';

  function write(buf) {
    data += buf;
  }

  function end() {
    let
      {template, locals} = JSON.parse(fs.readFileSync(filename));

    if (opts.minify) {
      template = htmlmin.minify(template, opts);
    }

    const exportObject = {template};

    if (opts.useMockdata === true) {
      exportObject.mockData = locals;
    }

    this.queue(`module.exports=${JSON.stringify(exportObject)};`);
    this.queue(null);
  }

  return through(write, end);
}

module.exports = ({compileDir = '.temp/browserify', matchPattern = '*.browserify.twig', global = {browserify: true}}) => {

  createDir(compileDir);

  compiler.compileFile = atomatic.compileFile.bind(atomatic);
  compiler.path = path.resolve(compileDir);
  compiler.matchPattern = matchPattern;
  compiler.global = global;
  compiler.compiledAtomaticFiles = compiler.compileAtomaticFiles([...atomatic.getCollectedFiles.call(atomatic).values()]);

  return (file, options) => {

    if (/\.js$/.test(file)) {
      return onJsFile(file, options);
    }

    if (/\.atomatic/.test(file)) {
      return onAtomaticFile(file, options);
    }

    return through();
  };
};

module.exports.compiler = compiler;