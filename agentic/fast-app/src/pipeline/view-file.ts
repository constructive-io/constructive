// The two files the desktop writes from the live database: the spec the agent
// reads (`.constructive/app-spec.json`, the database rendered with the build
// record's overlay), and `.constructive/view.json`, the last look at the
// database by id. The last look, and the schema the last build left, are kept
// only to say what changed outside the app; the planner never reads them.
//
// Only the file names are here so far. Reading and writing the view comes
// with the rest of the pipeline.

/** Project-relative and in git's spelling, like the build record. */
export const SPEC_FILE = '.constructive/app-spec.json';
export const VIEW_FILE = '.constructive/view.json';
