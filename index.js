const
  path = require('path'),
  fs = require('fs'),
  through = require('through'),
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
    });
  }

  return stream;
}

module.exports = ({compileDir = '.temp/browserify', matchPattern = '*.browserify.twig', global = {browserify: true}, useMockdata}) => {

  createDir(compileDir);

  compiler.compileFile = atomatic.compileFile.bind(atomatic);
  compiler.path = path.resolve(compileDir);
  compiler.matchPattern = matchPattern;
  compiler.global = global;
  compiler.compiledAtomaticFiles = compiler.compileAtomaticFiles([...atomatic.getCollectedFiles.call(atomatic).values()], useMockdata);

  return (file, options) => {

    if (/\.js$/.test(file)) {
      return onJsFile(file, options);
    }

    return through();
  };
};

module.exports.compiler = compiler;