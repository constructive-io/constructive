import { GraphQLScalarType, GraphQLError } from 'graphql';
import { createUploadPlugin } from '../src/plugin';

/**
 * Tests for the Upload scalar type created by the plugin.
 * Verifies parity with the v4 Upload scalar behavior.
 */

function getUploadScalar(): GraphQLScalarType {
  const plugin = createUploadPlugin();
  const hooks = plugin.schema!.hooks as any;

  // Simulate the build object that PostGraphile v5 provides
  let registeredScalar: GraphQLScalarType | undefined;
  const mockBuild = {
    graphql: { GraphQLScalarType, GraphQLError },
    registerScalarType(
      name: string,
      _extensions: any,
      factory: () => GraphQLScalarType,
      _reason: string
    ) {
      registeredScalar = factory();
    }
  };

  hooks.init({}, mockBuild);

  if (!registeredScalar) {
    throw new Error('Upload scalar was not registered');
  }
  return registeredScalar;
}

describe('Upload scalar', () => {
  let scalar: GraphQLScalarType;

  beforeAll(() => {
    scalar = getUploadScalar();
  });

  it('should have the correct name and description', () => {
    expect(scalar.name).toBe('Upload');
    expect(scalar.description).toBe(
      'The `Upload` scalar type represents a file upload.'
    );
  });

  describe('parseValue', () => {
    it('should return the promise from a valid upload value', () => {
      const fakePromise = Promise.resolve({ filename: 'test.txt' });
      const value = { promise: fakePromise };

      const result = scalar.parseValue(value);
      expect(result).toBe(fakePromise);
    });

    it('should accept any thenable promise property', () => {
      const thenableLike = { then: jest.fn() };
      const value = { promise: thenableLike };

      const result = scalar.parseValue(value);
      expect(result).toBe(thenableLike);
    });

    it('should throw GraphQLError for null value', () => {
      expect(() => scalar.parseValue(null)).toThrow(GraphQLError);
      expect(() => scalar.parseValue(null)).toThrow('Upload value invalid.');
    });

    it('should throw GraphQLError for undefined value', () => {
      expect(() => scalar.parseValue(undefined)).toThrow(GraphQLError);
      expect(() => scalar.parseValue(undefined)).toThrow(
        'Upload value invalid.'
      );
    });

    it('should throw GraphQLError for plain object without promise', () => {
      expect(() => scalar.parseValue({ foo: 'bar' })).toThrow(GraphQLError);
      expect(() => scalar.parseValue({ foo: 'bar' })).toThrow(
        'Upload value invalid.'
      );
    });

    it('should throw GraphQLError when promise is not thenable', () => {
      expect(() => scalar.parseValue({ promise: 'not-a-promise' })).toThrow(
        GraphQLError
      );
      expect(() => scalar.parseValue({ promise: 42 })).toThrow(
        'Upload value invalid.'
      );
    });

    it('should throw GraphQLError for string value', () => {
      expect(() => scalar.parseValue('test')).toThrow(GraphQLError);
    });

    it('should throw GraphQLError for number value', () => {
      expect(() => scalar.parseValue(123)).toThrow(GraphQLError);
    });
  });

  describe('parseLiteral', () => {
    it('should always throw GraphQLError', () => {
      const fakeAst = { kind: 'StringValue', value: 'test' };
      expect(() => scalar.parseLiteral(fakeAst as any, {})).toThrow(
        GraphQLError
      );
      expect(() => scalar.parseLiteral(fakeAst as any, {})).toThrow(
        'Upload literal unsupported.'
      );
    });
  });

  describe('serialize', () => {
    it('should always throw GraphQLError', () => {
      expect(() => scalar.serialize('anything')).toThrow(GraphQLError);
      expect(() => scalar.serialize('anything')).toThrow(
        'Upload serialization unsupported.'
      );
    });

    it('should throw even for null/undefined values', () => {
      expect(() => scalar.serialize(null)).toThrow(
        'Upload serialization unsupported.'
      );
      expect(() => scalar.serialize(undefined)).toThrow(
        'Upload serialization unsupported.'
      );
    });
  });
});
