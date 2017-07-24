const
  path = require('path'),
  Emitter = require('events').EventEmitter;

let hasBabel = true;

try {
  require('babel-core');
} catch (e) {
  hasBabel = false;
}

const compiler = module.exports = new Emitter();

compiler.setMaxListeners(Infinity);

compiler.compile = function (content, cb) {

  let matches;

  const regex = /[\'"]([a-z0-9]+-[^\'"\/]+)[\'"]/g;

  while ((matches = regex.exec(content.toString())) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (matches.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    const
      [replaceString, componentName] = matches,
      resolvedFile = this.resolve(componentName);

    if (resolvedFile !== componentName) {
      const regex = new RegExp(`${replaceString.replace(/([\(\)])/g, '\\$1')}`, 'g');
      content = content.replace(regex, `'${resolvedFile}'`);
    }
  }

  cb(null, content)
};

compiler.resolve = function (filename) {
  const
    collectedFiles = [...this.getFiles().keys()],
    separator = '-',
    basename = path.basename(filename, path.extname(filename)),
    [section, ...remainingSegments] = basename.split(separator),
    name = remainingSegments.join(separator),
    regex = new RegExp(`${section}\/.*\/${name}\.[^\/.]+$`);

  if (undefined !== name) {
    const found = collectedFiles.find((filename) => regex.test(filename) );
    console.log(regex, filename, found)

    if (found) {
      filename = found;
    }
  }

  return filename;
};