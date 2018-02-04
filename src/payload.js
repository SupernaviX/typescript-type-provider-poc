var ts = { };
ts.log = function() {}
// debugStuff();

class SchemaManager {
  constructor(schemaDir, readFile, watchFile) {
    this.schemaDir = schemaDir;
    this._readFile = readFile;
    this._watchFile = watchFile;
    this.refresh();
  }
  refresh() {
    const schemaFile = this.readFile(this.schemaDir + 'schema.json');
    this.schemas = JSON.parse(schemaFile);
  }
  fileExists(filename) {
    const localFilename = filename.substr(this.schemaDir.length);
    ts.log(`Manager checking if ${localFilename} exists`);
    return localFilename === 'schema.json' || localFilename === 'index.ts';
  }
  readFile(filename, encoding) {
    const localFilename = filename.substr(this.schemaDir.length);
    ts.log(`Manager reading ${localFilename}`);
    if (localFilename === 'index.ts') {
      return this._generateFile();
    }
    return this._readFile(filename, encoding);
  }

  watchFile(filename, callback) {
    ts.log('Manager watching file', filename);
    return this._watchFile(this.schemaDir + 'schema.json', (_, event) => {
      this.refresh();
      return callback(filename, event);
    });
  }

  _generateFile() {
    function typeofChecker(primitive) {
      return `function check${primitive}(input: any): input is ${primitive} { return typeof input === '${primitive}'; }`
    }
    const fileData = [
      typeofChecker('string'),
      typeofChecker('number'),
      typeofChecker('boolean'),
    ];
    for (const schema of this.schemas) {
      fileData.push(`export interface ${schema.name} {`);
      for (const prop of schema.props) {
        if (prop.type === 'array') {
          fileData.push(`  ${prop.name}: Array<${prop.itemType}>;`);
        } else {
          fileData.push(`  ${prop.name}: ${prop.type}`);
        }
      }
      fileData.push(`}`);
      fileData.push(`export function check${schema.name}(input: any): input is ${schema.name} {`);
      fileData.push(`  if (!input) { return false; }`);
      for (const prop of schema.props) {
        if (prop.type === 'array') {
          fileData.push(`  if (!Array.isArray(input.${prop.name})) { return false; }`);
          fileData.push(`  if (!input.${prop.name}.every(check${prop.itemType})) { return false; }`);
        } else {
          fileData.push(`  if (!check${prop.type}(input.${prop.name})) { return false; }`);
        }
      }
      fileData.push(`  return true;`);
      fileData.push('}');
    }
    return fileData.join('\n');
  }
}

_decorate(ts, 'sys', function(sys) {
  // TODO: this is a bigger hack than most of the rest of the project
  // Find the project's root directory by looking for the first folder with node_modules
  // Need to find a project-aware injection target
  const betterFileName = ts.normalizeSlashes(__filename);
  const rootDir = betterFileName.substr(0, betterFileName.indexOf('/node_modules'));

  const oldFileExists = sys.fileExists;
  sys.fileExists = function (filename) {
    ts.log('fileExists', filename);
    const manager = getSchemaManager(filename);
    if (manager) {
      return manager.fileExists(filename);
    }
    return oldFileExists(filename);
  };

  const oldReadFile = sys.readFile;
  sys.readFile = function (filename, encoding) {
    ts.log('readFile', filename, encoding);
    const manager = getSchemaManager(filename);
    if (manager) {
      return manager.readFile(filename);
    }
    return oldReadFile(filename, encoding);
  };

  // have to _decorate watchFile because tsserver.js reassigns it later
  let oldWatchFile = sys.watchFile;
  _decorate(sys, 'watchFile', function(owf) {
    oldWatchFile = owf;
    return function(filename, callback) {
      ts.log('watchFile', filename);
      const manager = getSchemaManager(filename);
      if (manager) {
        return manager.watchFile(filename, callback);
      }
      return owf(filename, callback);
    };
  });

  const schemaManagers = {};
  function getSchemaManager(path) {
    const schemaIndex = path.indexOf('@@schemas');
    if (schemaIndex === -1) {
      return null;
    }
    const schemaDir = path.substr(0, schemaIndex) + '@@schemas/';
    if (!schemaManagers[schemaDir]) {
      schemaManagers[schemaDir] = new SchemaManager(schemaDir, oldReadFile, oldWatchFile);
    }
    return schemaManagers[schemaDir];
  }

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
