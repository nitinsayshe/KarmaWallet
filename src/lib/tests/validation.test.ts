import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import {
  nameValidation,
  nanoIdValidation,
  objectReferenceValidation,
  optionalNameValidation,
  optionalNanoidValidation,
  optionalObjectReferenceValidation,
  optionalUuidValidation,
  optionalZipCodeValidation,
  uuidValidation,
  zipCodeValidation,
} from '../validation';

describe('validation logic works as expected', () => {
  beforeEach(() => {});

  afterAll(() => {});

  it('nanoIdValidation throws error on invalid string', () => {
    const testCases = ['123', '123&4', ''];

    testCases.forEach((testCase) => {
      expect(() => {
        nanoIdValidation.parse(testCase);
      }).toThrow();
    });
  });

  it('nanoIdValidation does not throw error on valid string', () => {
    const testCases = [
      '1234567890abcdefg2u-s',
      '1234567890abcdefg2u_s',
      '1234567890-bcdefg2u_s',
      '1234567890Abcdefg2uzs',
      'QWERTASDFGZXCVBQWERTA',
      'qwertasdfgzxcvbqwerta',
      '123123123123123123123',
      '_____________________',
      '---------------------',
    ];

    testCases.forEach((testCase) => {
      expect(() => {
        nanoIdValidation.parse(testCase);
      }).not.toThrow();
    });
  });

  it('optionalNanoidValidation does not throw error on valid string', () => {
    const testSchema = z.object({
      nanoid: optionalNanoidValidation,
    });
    const testObjects = [
      {},
      { nanoid: '1234567890abcdefg2u-s' },
      { nanoid: '1234567890abcdefg2u_s' },
      { nanoid: '1234567890-bcdefg2u_s' },
      { nanoid: '1234567890Abcdefg2uzs' },
    ];

    testObjects.forEach((testObject) => {
      expect(() => {
        testSchema.parse(testObject);
      }).not.toThrow();
    });
  });

  it('objectReferenceValidation throws error on invalid string', () => {
    const testCases = [
      '123',
      '123&4',
      '',
      '1234567890abcdefg2u-s',
      '1234567890abcdefg2u_s',
      '1234567890-bcdefg2u_s',
      '1234567890Abcdefg2uzs',
    ];

    testCases.forEach((testCase) => {
      expect(() => {
        objectReferenceValidation.parse(testCase);
      }).toThrow();
    });
  });

  it('objectReferenceValidation does not throw error on valid string', () => {
    const testCases = [new ObjectId().toString(), '62339e7f1fc03e8853a64738'];

    testCases.forEach((testCase) => {
      expect(() => {
        objectReferenceValidation.parse(testCase);
      }).not.toThrow();
    });
  });

  it('optionalObjectReferenceValidation does not throw error on valid string', () => {
    const testSchema = z.object({
      objectReference: optionalObjectReferenceValidation,
    });
    const testObjects = [{}, { objectReference: new ObjectId().toString() }, { objectReference: '62339e7f1fc03e8853a64738' }];

    testObjects.forEach((testObject) => {
      expect(() => {
        testSchema.parse(testObject);
      }).not.toThrow();
    });
  });

  it('nameValidation throws error on invalid string', () => {
    const testCases = [
      '{}',
      '<>',
      '()',
      ';',
      '`',
      '',
      '<div></div>',
      "; console.log('test')",
      '} test',
      ') test',
      "`; console.log('test')",
    ];

    testCases.forEach((testCase) => {
      expect(() => {
        nameValidation.parse(testCase);
      }).toThrow();
    });
  });

  it('nameValidation does not throw error on valid string', () => {
    const testCases = ['TestName', 'Test-Name', 'Test_Name', 'TestName123', 'Test Name123', "Test'Name"];

    testCases.forEach((testCase) => {
      expect(() => {
        nameValidation.parse(testCase);
      }).not.toThrow();
    });
  });

  it('optionalNameValidation does not throw error on valid string', () => {
    const testSchema = z.object({
      name: optionalNameValidation,
    });
    const testObjects = [
      {},
      { name: 'TestName' },
      { name: 'Test-Name' },
      { name: 'Test_Name' },
      { name: 'TestName123' },
      { name: 'Test Name123' },
      { name: "Test'Name" },
    ];

    testObjects.forEach((testObject) => {
      expect(() => {
        testSchema.parse(testObject);
      }).not.toThrow();
    });
  });

  it('uuidValidation throws error on invalid string', () => {
    const testCases = [
      '123',
      '123&4',
      '',
      '1234567890abcdefg2u-s',
      '1234567890abcdefg2u_s',
      '1234567890-bcdefg2u_s',
      '1234567890Abcdefg2uzs',
    ];

    testCases.forEach((testCase) => {
      expect(() => {
        uuidValidation.parse(testCase);
      }).toThrow();
    });
  });

  it('uuidValidation does not throw error on valid string', () => {
    const testCases = ['76646d62-120a-4c4d-bd67-59d240150e74', 'ec6b07ec-2969-4d46-9d6d-4eff781e889c'];
    testCases.forEach((testCase) => {
      expect(() => {
        uuidValidation.parse(testCase);
      }).not.toThrow();
    });
  });

  it('optionalUuidValidation does not throw error on valid string', () => {
    const testSchema = z.object({
      uuid: optionalUuidValidation,
    });
    const testObjects = [{}, { uuid: '76646d62-120a-4c4d-bd67-59d240150e74' }, { uuid: 'ec6b07ec-2969-4d46-9d6d-4eff781e889c' }];

    testObjects.forEach((testObject) => {
      expect(() => {
        testSchema.parse(testObject);
      }).not.toThrow();
    });
  });

  it('zipCodeValidation throws error on invalid string', () => {
    const testCases = [
      '123',
      '123&4',
      '',
      '1234567890abcdefg2u-s',
      '1234567890abcdefg2u_s',
      '1234567890-bcdefg2u_s',
      '1234567890Abcdefg2uzs',
    ];

    testCases.forEach((testCase) => {
      expect(() => {
        zipCodeValidation.parse(testCase);
      }).toThrow();
    });
  });

  it('zipCodeValidation does not throw error on valid string', () => {
    const testCases = ['00601', '00606', '01526', '01534', '19977', '19980', '20001', '20018', '89834', '89883', '90001', '90075'];
    testCases.forEach((testCase) => {
      expect(() => {
        zipCodeValidation.parse(testCase);
      }).not.toThrow();
    });
  });

  it('optionalZipCodeValidation does not throw error on valid string', () => {
    const testSchema = z.object({
      zipCode: optionalZipCodeValidation,
    });
    const testObjects = [{}, { zipCode: '00601' }, { zipCode: '00606' }, { zipCode: '01526' }, { zipCode: '01534' }, { zipCode: '19977' }, { zipCode: '19980' }, { zipCode: '20001' }, { zipCode: '20018' }, { zipCode: '89834' }, { zipCode: '89883' }, { zipCode: '90001' }, { zipCode: '90075' }];

    testObjects.forEach((testObject) => {
      expect(() => {
        testSchema.parse(testObject);
      }).not.toThrow();
    });
  });
});
