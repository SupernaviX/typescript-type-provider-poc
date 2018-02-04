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
