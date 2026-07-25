-- Shared fixture: scoped-routing resolver (test stand-in)
--
-- The published @constructive-db/routing module is SCHEMA + GRANTS ONLY: it
-- ships the routing tables but no procedures, so
-- constructive_routing_public.resolve_route() does not exist after
-- `pnpm fixtures:install`. This file installs the frozen DB<->server resolver
-- contract verbatim from constructive-db
-- (application/constructive/deploy/schemas/constructive_routing_public/procedures/resolve_route)
-- so tests can exercise the scoped-routing path today.
--
-- TODO: drop this file once @constructive-db/routing publishes the resolver
--       procedure and the pinned module provides resolve_route() directly.

CREATE FUNCTION constructive_routing_public.resolve_route(
  request_host text,
  request_path text,
  request_method text,
  OUT route_binding_id uuid,
  OUT hostname text,
  OUT matched_wildcard boolean,
  OUT matched_path text,
  OUT method text,
  OUT priority int,
  OUT domain_id uuid,
  OUT target_catalog_id uuid,
  OUT target_module text,
  OUT target_source_id uuid,
  OUT target_owner_scope text,
  OUT target_owner_key uuid,
  OUT resolved_config jsonb,
  OUT verification_status text,
  OUT tls_status text,
  OUT tls_secret_name text
) RETURNS record AS $$
SELECT
  rb.id AS route_binding_id,
  hb.hostname AS hostname,
  hb.hostname <> split_part(lower(request_host), ':', 1) AS matched_wildcard,
  rb.path AS matched_path,
  rb.method AS method,
  rb.priority AS priority,
  rb.domain_id AS domain_id,
  COALESCE(rb.target_api_id, rb.target_site_id, rb.target_function_id) AS target_catalog_id,
  CASE
    WHEN rb.target_api_id IS NOT NULL THEN 'api'
    WHEN rb.target_site_id IS NOT NULL THEN 'site'
    WHEN rb.target_function_id IS NOT NULL THEN 'function'
  END AS target_module,
  COALESCE(a.id, s.id, f.id) AS target_source_id,
  COALESCE(a.owner_scope, s.owner_scope, f.owner_scope) AS target_owner_scope,
  nullif(COALESCE(a.owner_key, s.owner_key, f.owner_key), uuid_nil()) AS target_owner_key,
  CASE
    WHEN rb.target_api_id IS NOT NULL THEN (COALESCE(a.config, '{}'::jsonb)) || jsonb_strip_nulls(jsonb_build_object('name', a.name, 'dbname', a.dbname, 'role_name', a.role_name, 'anon_role', a.anon_role))
    WHEN rb.target_site_id IS NOT NULL THEN (COALESCE(s.config, '{}'::jsonb)) || jsonb_strip_nulls(jsonb_build_object('name', s.name))
    WHEN rb.target_function_id IS NOT NULL THEN jsonb_strip_nulls(jsonb_build_object('task_identifier', f.task_identifier))
  END AS resolved_config,
  hb.verification_status AS verification_status,
  hb.tls_status AS tls_status,
  hb.tls_secret_name AS tls_secret_name
FROM "constructive_routing_public".hostname_bindings AS hb
  INNER JOIN "constructive_routing_public".route_bindings AS rb ON rb.domain_id = hb.domain_id
  LEFT OUTER JOIN "constructive_catalog_public".apis AS a ON a.id = rb.target_api_id
  LEFT OUTER JOIN "constructive_catalog_public".sites AS s ON s.id = rb.target_site_id
  LEFT OUTER JOIN "constructive_catalog_public".functions AS f ON f.id = rb.target_function_id
WHERE
  (hb.hostname = split_part(lower(request_host), ':', 1) OR (hb.is_wildcard AND hb.parent_hostname = substr(split_part(lower(request_host), ':', 1), strpos(split_part(lower(request_host), ':', 1), '.') + 1)))
  AND ((rb.path = '/' OR (concat('/', ltrim(COALESCE(request_path, '/'), '/')) = rb.path OR "left"(concat('/', ltrim(COALESCE(request_path, '/'), '/')), length(rb.path) + 1) = (rb.path || '/')))
  AND ((rb.method IS NULL OR upper(rb.method) = upper(request_method)) AND rb.is_active))
ORDER BY
  hb.hostname = split_part(lower(request_host), ':', 1) DESC,
  length(rb.path) DESC,
  rb.method IS NOT NULL DESC,
  rb.priority DESC,
  rb.id ASC
LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION constructive_routing_public.resolve_route(text, text, text)
  TO administrator, authenticated, anonymous;
