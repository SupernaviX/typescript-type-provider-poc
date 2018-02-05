# Typescript Type Provider POC
![see it in action](https://i.imgur.com/9cJnRWG.gif)

## What does it do?
Given a "schema" file, generates interfaces and type guards at compile time.

## How does it work?
As a post-install step, this injects code into `tsc.js` and `tsserver.js` in the local copy of `typescript`. That code monkeypatches typescript's filesystem wrapper, and tricks it into thinking that `@@schemas` contains a typescript module.

Needless to say, not suitable for production code.