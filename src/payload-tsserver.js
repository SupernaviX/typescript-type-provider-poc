var ts = { };
ts.log = function() {}

function debugStuff() {
  process.env.TSS_LOG = "-level verbose -traceToConsole true -file \"C:/Codez/tsc-experiment/server-logs.txt\"";
  const fs = require('fs');
  const file = "C:/Codez/tsc-experiment/injected-logs.txt";    
  const fd = fs.openSync(file, "a+");
  ts.log = function(...args) {
    const buf = new Buffer("" + new Date().getTime() + ": " + args.join(' ') + '\n');
    fs.writeSync(fd, buf, 0, buf.length, null);
  }
}

_decorate(ts, 'sys', function(sys) {

  // TODO: this is a bigger hack than most of the rest of the project
  // Find the project's root directory by looking for the first folder with node_modules
  // Need to find a project-aware injection target
  const betterFileName = ts.normalizeSlashes(__filename);
  const rootDir = betterFileName.substr(0, betterFileName.indexOf('/node_modules'));

  // Namespace all the fake code inside of a directory called "fake-module"
  function toFakeModuleName(filename) {
    ts.log('toFakeModuleName', filename);
    const cd = ts.normalizeSlashes(rootDir);
    const fakeModulePath = cd + "/test/fake-module";
    if (!filename.startsWith(fakeModulePath)) {
      return null;
    }
    return "/" + filename.substr(fakeModulePath.length + 1);
  }

  const oldDirectoryExists = sys.directoryExists;
  sys.directoryExists = function (filename) {
    ts.log('directoryExists', filename);
    const name = toFakeModuleName(filename);
    if (name === "/") {
      // The "root directory" of the fake module exists
      return true;
    }
    return oldDirectoryExists(filename);
  };

  const oldFileExists = sys.fileExists;
  sys.fileExists = function (filename) {
    ts.log('fileExists', filename);
    const name = toFakeModuleName(filename);
    if (name === "/generation-test.ts") {
      // The "generated" file in the fake module exists
      return true;
    }
    return oldFileExists(filename);
  };

  const oldReadFile = sys.readFile;
  sys.readFile = function (filename, encoding) {
    ts.log('readFile', filename, encoding);
    const name = toFakeModuleName(filename);
    if (name === "/generation-test.ts") {
      const moduleBody = `
        export default function() { console.log('GENERATED CODE!!!'); }
        export interface Person {
          name: string;
          age: number;
          birthday: Date;
        }
      `;
      return moduleBody;
    };
    return oldReadFile(filename, encoding);
  };

  
  // Have to turn off file watching in generated code for now
  // because an eager beaver in tsserver.js is calling fs.stat directly
  // TODO: this would be a good place to "watch" generated files
  _wrap(sys, 'watchFile', function (oldWatchFile, filename, callback) {
    if (filename.indexOf('fake-module') > -1) {
      return { close: function() { } }
    }
    oldWatchFile(filename, callback);
  })
  return sys;
});

function _decorate(obj, prop, func) {
  ts.log('DECORATING ' + prop);
  var existingValue = undefined;
  // If this code runs before the thing it modifies is defined,
  // abuse setters to do the modification later
  Object.defineProperty(obj, prop, {
    enumerable: true,
    configurable: true,
    get: function() { return existingValue; },
    set: function(newValue) {
      if (!existingValue) {
        existingValue = func(newValue);
        ts.log('LAZILY DECORATED ' + prop);
      }
      return existingValue;
    }
  })
}

function _wrap(obj, prop, takesOldThenArgs) {
  ts.log('WRAPPING ' + prop);
  return _decorate(obj, prop, function(old) {
    ts.log('WRAPPED ' + prop);
    return function(...args) {
      ts.log('CALLING WRAPPED ' + prop);
      return takesOldThenArgs(old, ...args);
    }
  });
}
