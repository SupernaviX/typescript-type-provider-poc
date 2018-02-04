var ts = { };
ts.log = function() {}

function debugStuff() {
  ts.log = function(...args) {
    console.log(...args);
  }
}