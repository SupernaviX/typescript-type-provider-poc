import * as ts from 'typescript';
import local from './local';
import { Person } from './fake-module/generation-test';

const someGuy: Person = {
  name: 'Fred',
  age: 31337,
  birthday: new Date(1963, 11, 23)
};

console.log('Typescript code!');
local();
