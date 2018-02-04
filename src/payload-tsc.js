// const ts = require('typescript');
// const oldCreateCompilerHost = ts.createCompilerHost;
// const oldWatchCompilerHost = ts.createWatchCompilerHost;

var ts = {};
_decorate(ts, 'createCompilerHost', function(oldCreateCompilerHost) {
  return function(...args) {
    const host = oldCreateCompilerHost(...args);
    const currentDirectory = host.getCurrentDirectory();
    for (var prop in host) {
      // __trace(host, prop);
    }
    function toFakeModuleName(filename) {
      const cd = ts.normalizeSlashes(host.getCurrentDirectory());
      const fakeModulePath = cd + "/test/fake-module";
      if (!filename.startsWith(fakeModulePath)) {
        return null;
      }
      return "/" + filename.substr(fakeModulePath.length + 1);
    }
    const oldDirectoryExists = host.directoryExists;
    host.directoryExists = function (filename) {
      const name = toFakeModuleName(filename);
      if (name === "/") {
        return true;
      }
      return oldDirectoryExists(filename);
    }
    const oldFileExists = host.fileExists;
    host.fileExists = function(filename) {
      const name = toFakeModuleName(filename);
      if (name === "/generation-test.ts") {
        return true;
      }
      return oldFileExists(filename);
    };
    const oldGetSourceFile = host.getSourceFile;
    host.getSourceFile = function(fileName, languageVersion, onError) {
      const name = toFakeModuleName(fileName);
      if (name === "/generation-test.ts") {
        const moduleBody = `
          export default function() { console.log('GENERATED CODE!!!'); }
          export interface Person {
            name: string;
            age: number;
            birthday: Date;
          }
        `;
        return ts.createSourceFile(fileName, moduleBody, languageVersion, args[1]);
      }
      return oldGetSourceFile(fileName, languageVersion, onError);
    };
    /*
    const moduleResolutionCache = ts.createModuleResolutionCache(currentDirectory, x => host.getCanonicalFileName(x));
    host.resolveModuleNames = function(moduleNames, containingFile) {
      const names = moduleNames.map(name => {
        if (name === '@@fake-module/generation-test') {
          return {
            resolvedFileName: ts.normalizeSlashes(currentDirectory) + "/generation-test.ts",
            originalPath: undefined,
            extension: '.ts',
            isExternalLibraryImport: false,
            packageId: undefined
          };
        }
        return ts.resolveModuleName(name, containingFile, args[0], host, moduleResolutionCache).resolvedModule;
      });
      console.log(names);
      return names;
    }
    */
    return host;
  };
});

function _decorate(obj, method, func) {
  Object.defineProperty(obj, method, {
    configurable: true,
    set: (realValue) => {
      Object.defineProperty(obj, method, {
        value: func(realValue)
      }); 
    }
  })
}

function _trace(obj, method) {
  const oldMethod = obj[method];
  if (typeof oldMethod !== 'function') {
    return;
  }
  console.log(`MONKEYPATCHING ${method}...`)
  obj[method] = function(...args) {
    console.log(`MONKEYPATCHED CALL TO ${method}!!!`, args);
    return oldMethod.apply(obj, args);
  }
}
