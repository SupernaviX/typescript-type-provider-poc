import * as schemas from './@@schemas';

const doc: schemas.Person = {
  fullName: "John Smith",
  addresses: [
    {
      line1: "238 Earl's Court Road",
      line2: "London, UK"
    }
  ]
};

if (schemas.isPerson(doc)) {
  console.log('yay');
}