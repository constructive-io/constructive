import type {
  UploadFieldDefinition,
  UploadResolver,
  FileUpload,
  UploadPluginInfo,
  UploadPluginOptions
} from '../src/types';

/**
 * Tests for the UploadFieldDefinition type interface.
 * Verifies both type-name based and smart-tag based forms are supported.
 */

describe('UploadFieldDefinition', () => {
  const mockResolver: UploadResolver = async (
    upload: FileUpload,
    _args: any,
    _context: any,
    _info: { uploadPlugin: UploadPluginInfo }
  ) => {
    return upload.filename;
  };

  describe('type-name based definition', () => {
    it('should accept name, namespaceName, type, and resolve', () => {
      const def: UploadFieldDefinition = {
        name: 'text',
        namespaceName: 'pg_catalog',
        type: 'Upload',
        resolve: mockResolver
      };

      expect(def.name).toBe('text');
      expect(def.namespaceName).toBe('pg_catalog');
      expect(def.type).toBe('Upload');
      expect(def.resolve).toBe(mockResolver);
      expect(def.tag).toBeUndefined();
    });

    it('should require all mandatory fields', () => {
      const def: UploadFieldDefinition = {
        name: 'jsonb',
        namespaceName: 'pg_catalog',
        type: 'JSON',
        resolve: mockResolver
      };

      expect(def).toBeDefined();
    });
  });

  describe('smart-tag based definition', () => {
    it('should accept tag and resolve', () => {
      const def: UploadFieldDefinition = {
        tag: 'upload',
        resolve: mockResolver
      };

      expect(def.tag).toBe('upload');
      expect(def.resolve).toBe(mockResolver);
      expect(def.name).toBeUndefined();
      expect(def.namespaceName).toBeUndefined();
    });

    it('should accept optional type field', () => {
      const def: UploadFieldDefinition = {
        tag: 'imageUpload',
        resolve: mockResolver,
        type: 'image'
      };

      expect(def.tag).toBe('imageUpload');
      expect(def.type).toBe('image');
    });
  });

  describe('UploadResolver', () => {
    it('should receive FileUpload with expected properties', async () => {
      const mockUpload: FileUpload = {
        filename: 'test.png',
        mimetype: 'image/png',
        encoding: '7bit',
        createReadStream: jest.fn()
      };

      const info = {
        uploadPlugin: {
          tags: { upload: true },
          type: 'image'
        }
      };

      const result = await mockResolver(mockUpload, {}, {}, info);
      expect(result).toBe('test.png');
    });

    it('should work with minimal FileUpload (only filename and createReadStream)', async () => {
      const mockUpload: FileUpload = {
        filename: 'doc.pdf',
        createReadStream: jest.fn()
      };

      const info = {
        uploadPlugin: {
          tags: {}
        }
      };

      const result = await mockResolver(mockUpload, {}, {}, info);
      expect(result).toBe('doc.pdf');
    });
  });

  describe('UploadPluginOptions', () => {
    it('should accept empty options', () => {
      const opts: UploadPluginOptions = {};
      expect(opts.uploadFieldDefinitions).toBeUndefined();
    });

    it('should accept an array of mixed field definitions', () => {
      const opts: UploadPluginOptions = {
        uploadFieldDefinitions: [
          {
            name: 'text',
            namespaceName: 'pg_catalog',
            type: 'Upload',
            resolve: mockResolver
          },
          {
            tag: 'upload',
            resolve: mockResolver
          }
        ]
      };

      expect(opts.uploadFieldDefinitions).toHaveLength(2);
    });
  });
});
