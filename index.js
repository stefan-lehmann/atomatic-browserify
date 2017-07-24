const
  through = require('through'),
  atomatic = require('atomatic'),
  htmlmin = require('html-minifier'),
  compiler = require('./compiler');

compiler.getFiles = atomatic.getCollectedFiles.bind(atomatic);

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

function onAtomaticFile(file, {_flags: opts={}}) {

  let data = '';

  function write(buf) {
    data += buf;
  }

  function end () {
    let {source: template, locals: data} = atomatic.compileFile(file, {browserify: true});

    if (opts.minify) {
      template = htmlmin.minify(template, opts);
      data = {};
    }
    this.queue(`module.exports=${JSON.stringify({template, data})};`);
    this.queue(null);
  }

  return through(write, end);
}

module.exports = function (file, options) {

  if (/.js/.test(file)) {
    return onJsFile(file, options);
  }

  if (/.twig/.test(file)) {
    return onAtomaticFile(file, options);
  }

  return through();
};

module.exports.compiler = compiler;