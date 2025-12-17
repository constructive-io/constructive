\echo Use "CREATE EXTENSION pgpm-types" to load this file. \quit
CREATE DOMAIN attachment AS text 
  CHECK (value ~ E'^(https?)://[^\\s/$.?#].[^\\s]*$');

COMMENT ON DOMAIN attachment IS '@name pgpmInternalTypeAttachment';

CREATE DOMAIN email AS citext 
  CHECK (value ~ E'^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');

COMMENT ON DOMAIN email IS '@name pgpmInternalTypeEmail';

CREATE DOMAIN hostname AS text 
  CHECK (value ~ E'^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$');

COMMENT ON DOMAIN hostname IS '@name pgpmInternalTypeHostname';

CREATE DOMAIN image AS jsonb 
  CHECK (
  value ?& ARRAY['url', 'mime']
    AND (value ->> 'url') ~ E'^(https?)://[^\\s/$.?#].[^\\s]*$'
);

COMMENT ON DOMAIN image IS '@name pgpmInternalTypeImage';

CREATE DOMAIN multiple_select AS jsonb 
  CHECK (value ?& ARRAY['value']);

COMMENT ON DOMAIN multiple_select IS '@name pgpmInternalTypeMultipleSelect';

CREATE DOMAIN origin AS text 
  CHECK (value = SUBSTRING(value FROM '^(https?://[^/]*)'));

COMMENT ON DOMAIN origin IS '@name pgpmInternalTypeOrigin';

CREATE DOMAIN single_select AS jsonb 
  CHECK (value ?& ARRAY['value']);

COMMENT ON DOMAIN single_select IS '@name pgpmInternalTypeSingleSelect';

CREATE DOMAIN upload AS jsonb 
  CHECK (
  value ?& ARRAY['url', 'mime']
    AND (value ->> 'url') ~ E'^(https?)://[^\\s/$.?#].[^\\s]*$'
);

COMMENT ON DOMAIN upload IS '@name pgpmInternalTypeUpload';

CREATE DOMAIN url AS text 
  CHECK (value ~ E'^(https?)://[^\\s/$.?#].[^\\s]*$');

COMMENT ON DOMAIN url IS '@name pgpmInternalTypeUrl';