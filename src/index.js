const fs = require('fs');
const path = require('path');

const projRoot = path.normalize(path.join(__dirname, '..'));

backup('node_modules/typescript/lib/tsserver.js');
backup('node_modules/typescript/lib/tsc.js');

generate('node_modules/typescript/lib/tsserver.js', [
  'src/payload.js',
  'node_modules/typescript/lib/tsserver.orig.js'
]);

generate('node_modules/typescript/lib/tsc.js', [
  'src/payload.js',
  'node_modules/typescript/lib/tsc.orig.js'
]);

function backup(file) {
  const fullPath = path.join(projRoot, file);
  const { dir, name, ext } = path.parse(fullPath);
  const newPath = path.join(dir, `${name}.orig${ext}`);
  if (!fs.existsSync(newPath)) {
    fs.writeFileSync(newPath, fs.readFileSync(fullPath));
  }
}

function generate(target, sources) {
  const codez = sources.map(s => {
    const fullpath = path.join(projRoot, s);
    return fs.readFileSync(fullpath);
  }).join('\n');
  const fullTarget = path.join(projRoot, target);
  fs.writeFileSync(fullTarget, codez);
}