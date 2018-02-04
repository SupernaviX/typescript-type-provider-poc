import * as ts from 'typescript';
import local from './local';
import { Person } from './@@schemas';

const someGuy: Person = {
  name: 'Fred',
  age: 31337,
  addresses: [
    { line1: 'my', line2: 'ass' }
  ]
};

console.log('Typescript code!');
local();
