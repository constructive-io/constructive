// AppSpec v1 as TypeScript, plus the two values every reader of a spec shares.
// `app-spec.schema.json` is the source of truth for the shape. This file
// imports nothing, so the desktop vendors it as is (`pnpm sync:app-spec`) and
// types its own AppSpec code from it.

export type SpecFieldType =
	| 'text'
	| 'long_text'
	| 'integer'
	| 'decimal'
	| 'money'
	| 'boolean'
	| 'date'
	| 'timestamp'
	| 'email'
	| 'url'
	| 'uuid'
	| 'json';

export type SpecField = {
	name: string;
	type: SpecFieldType;
	required?: boolean;
	default?: unknown;
	enum?: string[];
	label?: string;
};

export type SpecBelongsTo = { field: string; to: string; onDelete?: 'cascade' | 'set_null' | 'restrict'; label?: string };

/**
 * Who sees an entity's rows: every app member, only the user who made each
 * row, or the members of the one entity of a membership scope each row
 * belongs to (an organization for `org`, or an entity type's entity).
 */
export type SpecAccess = 'shared' | 'private' | { scope: string };

export type SpecEntity = {
	name: string;
	label?: string;
	access?: SpecAccess;
	fields: SpecField[];
	belongsTo?: SpecBelongsTo[];
};

export type SpecLink = { name?: string; between: [string, string] };

/** Additions to a curated blueprint: new tables, new columns and keys on its tables, new links. */
export type BackendExtend = {
	entities?: SpecEntity[];
	fields?: Record<string, SpecField[]>;
	belongsTo?: Record<string, SpecBelongsTo[]>;
	links?: SpecLink[];
};

export type FilterValue = string | number | boolean | null;

export type DashboardTileSpec =
	| { kind: 'count'; resource: string; label?: string; filters?: Record<string, FilterValue> }
	| { kind: 'recent'; resource: string; limit?: number; label?: string };

/** The signed-in user's id, filled in by the app on create. */
export const CURRENT_USER_ID = '$currentUserId';

/**
 * `$scope:<scope>`: the id of the active entity of a membership scope, filled
 * in by the app on create, e.g. `$scope:org` for a record that belongs to the
 * selected organization. Without a workspace switcher it is the signed-in
 * user's own id, which is also their personal organization.
 */
export const SCOPE_DEFAULT_PREFIX = '$scope:';

/** The scope a `$scope:<scope>` default names; null for any other value. */
export function scopeOfDefault(value: unknown): string | null {
	if (typeof value !== 'string' || !value.startsWith(SCOPE_DEFAULT_PREFIX)) return null;
	const scope = value.slice(SCOPE_DEFAULT_PREFIX.length);
	return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(scope) ? scope : null;
}

/** How a form edits a field. */
export type FieldInput =
	| 'text'
	| 'textarea'
	| 'email'
	| 'url'
	| 'number'
	| 'integer'
	| 'currency'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'time'
	| 'select'
	| 'relation'
	| 'json'
	| 'uuid';

export type FieldUiSpec = {
	label?: string;
	/** Help text under the input. */
	description?: string;
	/** Allowed values; the field becomes a select. */
	options?: string[];
	hidden?: boolean;
	input?: FieldInput;
	/** Overrides `_meta`, e.g. false for a column a trigger fills. */
	required?: boolean;
	/** `$currentUserId`, `$scope:<scope>`, or a literal sent on create when the form has none. */
	default?: FilterValue;
};

/** What an entity's record page shows of its membership scope. */
export type PanelKind = 'members' | 'files';

/** Panels on an entity table's record page: the entity's members and its files. */
export type ResourcePanelsSpec = {
	/** The membership scope whose entity this table holds, e.g. `data_room`. */
	scope: string;
	show: PanelKind[];
};

export type ResourceUiSpec = {
	label?: string;
	singular?: string;
	icon?: string;
	titleField?: string;
	columns?: string[];
	formFields?: string[];
	hidden?: boolean;
	fields?: Record<string, FieldUiSpec>;
	/** Members and files on the record page, for an entity type's table. */
	panels?: ResourcePanelsSpec;
};

export type AppSpec = {
	version: 1;
	name: string;
	tagline?: string;
	backend:
		| { kind: 'blueprint'; slug: string; extend?: BackendExtend }
		| { kind: 'custom'; entities: SpecEntity[]; links?: SpecLink[] };
	seed?: Record<string, Array<Record<string, unknown>>>;
	ui?: {
		nav?: string[];
		resources?: Record<string, ResourceUiSpec>;
		dashboard?: { tiles: DashboardTileSpec[] };
		/** A switcher between the user's personal workspace and their organizations; `$scope:<scope>` keys follow it. */
		workspace?: { scope: string };
		/** Membership scopes that get an access page: members, invitations, profiles, capabilities. */
		access?: string[];
	};
};

/** Key used to match names across spellings: `volunteer_shifts` ≡ `volunteerShifts` ≡ `volunteer-shifts`. */
export function normalizeKey(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
