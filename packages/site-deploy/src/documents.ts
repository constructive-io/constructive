/**
 * GraphQL documents and generated-name derivation.
 *
 * Plain strings, no graphql dependency: the same documents work through the
 * generated SDK, urql, Apollo or a bare fetch. Every field name is generated
 * per scope — unprefixed at the tenant (`database`) scope, `platform`-prefixed
 * on the self-hosted lane — so the names are derived in one place here rather
 * than spelled out at each call site.
 */

import type { SiteDeployNames } from './types';

/** Derive the deploy surface's field names for a scope. */
export function deployNames(scope: 'database' | 'platform' = 'database'): SiteDeployNames {
  const Prefix = scope === 'platform' ? 'Platform' : '';
  const prefix = scope === 'platform' ? 'platform' : '';
  const lower = (name: string) => (prefix ? `${prefix}${name}` : lowerFirst(name));
  return {
    bulkUploadMutation: `upload${Prefix}Files`,
    releasesQuery: `${lower('SiteReleases')}`,
    createRelease: `create${Prefix}SiteRelease`,
    releaseInputField: lower('SiteRelease'),
    updateRelease: `update${Prefix}SiteRelease`,
    releasePatchField: `${lower('SiteRelease')}Patch`,
    releasePayloadField: lower('SiteRelease'),
    updateSite: `update${Prefix}Site`,
    sitePatchField: `${lower('Site')}Patch`,
    sitePayloadField: lower('Site'),
    // Preview procedures are exposed unprefixed; a plane that generates them
    // per scope can override these two.
    provisionPreview: 'provisionSitePreview',
    setPreview: 'setSitePreview',
  };
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/** Bulk presigned-upload mutation for one storage plane. */
export function buildBulkUploadMutation(mutation: string): string {
  return `
  mutation BulkUpload($input: ${inputTypeName(mutation)}!) {
    ${mutation}(input: $input) {
      files {
        uploadUrl
        fileId
        key
        deduplicated
      }
    }
  }
`;
}

/** `uploadFiles` → `UploadFileBulkInput`, `uploadPlatformFiles` → … */
function inputTypeName(mutation: string): string {
  const capitalized = mutation.charAt(0).toUpperCase() + mutation.slice(1);
  return `${capitalized.replace(/s$/, '')}BulkInput`;
}

/** The site's existing release row, if it has one (the row is UNIQUE per site). */
export function buildReleaseQuery(names: SiteDeployNames): string {
  return `
  query SiteRelease($siteId: UUID!) {
    ${names.releasesQuery}(where: { siteId: { equalTo: $siteId } }, first: 1) {
      nodes {
        id
        commitId
        storeId
        manifest
      }
    }
  }
`;
}

export function buildCreateReleaseMutation(names: SiteDeployNames): string {
  return `
  mutation CreateSiteRelease($input: ${typeName(names.createRelease)}Input!) {
    ${names.createRelease}(input: $input) {
      ${names.releasePayloadField} {
        id
        commitId
        storeId
      }
    }
  }
`;
}

export function buildUpdateReleaseMutation(names: SiteDeployNames): string {
  return `
  mutation UpdateSiteRelease($input: ${typeName(names.updateRelease)}Input!) {
    ${names.updateRelease}(input: $input) {
      ${names.releasePayloadField} {
        id
        commitId
        storeId
      }
    }
  }
`;
}

/** Publishing and rollback are the same mutation: move the pointer. */
export function buildPublishMutation(names: SiteDeployNames): string {
  return `
  mutation PublishSiteRelease($input: ${typeName(names.updateSite)}Input!) {
    ${names.updateSite}(input: $input) {
      ${names.sitePayloadField} {
        id
        activeCommitId
      }
    }
  }
`;
}

/** Claims (or reuses) the preview hostname and points the ref at a commit. */
export function buildProvisionPreviewMutation(names: SiteDeployNames): string {
  return `
  mutation ProvisionSitePreview($input: ${typeName(names.provisionPreview)}Input!) {
    ${names.provisionPreview}(input: $input) {
      result {
        id
        previewRef
        domain {
          hostname
        }
      }
    }
  }
`;
}

/** Moves an existing ref without touching routing. */
export function buildSetPreviewMutation(names: SiteDeployNames): string {
  return `
  mutation SetSitePreview($input: ${typeName(names.setPreview)}Input!) {
    ${names.setPreview}(input: $input) {
      result
    }
  }
`;
}

function typeName(field: string): string {
  return field.charAt(0).toUpperCase() + field.slice(1);
}
