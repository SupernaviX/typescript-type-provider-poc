var ts = { };
ts._debugLog = function() {}

/**
 * Given the path to a @@schemas directory,
 * provide methods to interact with fake "files" in that directory
 */
class SchemaManager {
  constructor(schemaDir, readFile, watchFile) {
    this.schemaDir = schemaDir;
    this._readFile = readFile;
    this._watchFile = watchFile;
    this._refresh();
  }
  _refresh() {
    try {
      const schemaFile = this.readFile(this.schemaDir + 'schema.json');
      this.schemas = JSON.parse(schemaFile);
    } catch (e) {
      ts._debugLog(e.message);
      this.schemas = null;
    }
  }
  fileExists(filename) {
    const localFilename = filename.substr(this.schemaDir.length);
    ts._debugLog(`Manager checking if ${localFilename} exists`);
    return localFilename === 'schema.json' || localFilename === 'index.ts';
  }
  readFile(filename, encoding) {
    const localFilename = filename.substr(this.schemaDir.length);
    ts._debugLog(`Manager reading ${localFilename}`);
    if (localFilename === 'index.ts') {
      return this._generateFile();
    }
    return this._readFile(filename, encoding);
  }

  watchFile(filename, callback) {
    ts._debugLog('Manager watching file', filename);
    return this._watchFile(this.schemaDir + 'schema.json', (_, event) => {
      this._refresh();
      return callback(filename, event);
    });
  }

  _generateFile() {
    if (!this.schemas || !this.schemas.length) {
      // Export something so that imports don't break
      return 'export interface NothingDefined {}'
    }

    // generate some primitive methods
    function typeofChecker(primitive) {
      return `function is${primitive}(input: any): input is ${primitive} { return typeof input === '${primitive}'; }`
    }
    const fileData = [
      typeofChecker('string'),
      typeofChecker('number'),
      typeofChecker('boolean'),
    ];

    for (const schema of this.schemas) {
      // generate an interface
      fileData.push(`export interface ${schema.name} {`);
      for (const prop of schema.props) {
        if (prop.type === 'array') {
          fileData.push(`  ${prop.name}: Array<${prop.itemType}>;`);
        } else {
          fileData.push(`  ${prop.name}: ${prop.type}`);
        }
      }
      fileData.push(`}`);

      // generate a type guard method
      fileData.push(`export function is${schema.name}(input: any): input is ${schema.name} {`);
      fileData.push(`  if (!input) { return false; }`);
      for (const prop of schema.props) {
        if (prop.type === 'array') {
          fileData.push(`  if (!Array.isArray(input.${prop.name})) { return false; }`);
          fileData.push(`  if (!input.${prop.name}.every(is${prop.itemType})) { return false; }`);
        } else {
          fileData.push(`  if (!is${prop.type}(input.${prop.name})) { return false; }`);
        }
      }
      fileData.push(`  return true;`);
      fileData.push('}');
    }
    return fileData.join('\n');
  }
}

// monkeypatch a few methods on ts.sys to forward to a "SchemaManager"
// if they're operating on something inside of @@schemas
_decorate(ts, 'sys', function(sys) {
  const oldFileExists = sys.fileExists;
  sys.fileExists = function (filename) {
    ts._debugLog('fileExists', filename);
    const manager = getSchemaManager(filename);
    if (manager) {
      return manager.fileExists(filename);
    }
    return oldFileExists(filename);
  };

  const oldReadFile = sys.readFile;
  sys.readFile = function (filename, encoding) {
    ts._debugLog('readFile', filename, encoding);
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
      ts._debugLog('watchFile', filename);
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

/**
 * Since this file needs to be injected before any other code runs,
 * abuse setters to apply these monkeypatches once their targets exist.
 */
function _decorate(obj, prop, func) {
  ts._debugLog('DECORATING ' + prop);
  var existingValue = undefined;

  Object.defineProperty(obj, prop, {
    enumerable: true,
    configurable: true,
    get: function() { return existingValue; },
    set: function(newValue) {
      if (!existingValue) {
        existingValue = func(newValue);
        ts._debugLog('LAZILY DECORATED ' + prop);
      }
      return existingValue;
    }
  })
}