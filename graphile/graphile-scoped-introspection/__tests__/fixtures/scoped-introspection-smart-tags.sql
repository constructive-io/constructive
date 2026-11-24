-- Tables that the exposed schema references only through @foreignKey smart
-- tags. None of them is reachable through a catalog dependency.
CREATE SCHEMA smart_tag_root;
CREATE SCHEMA smart_tag_hidden;
CREATE SCHEMA smart_tag_transitive;
CREATE SCHEMA "Smart_Tag_Quoted";
CREATE SCHEMA "Smart_Tag_Prüfung";
CREATE SCHEMA smart_tag_unrelated;

-- Reached only through the tag on smart_tag_hidden.owners.
CREATE TABLE smart_tag_transitive.teams (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE smart_tag_hidden.priority (
  value text PRIMARY KEY,
  description text
);
COMMENT ON TABLE smart_tag_hidden.priority IS E'@enum\nTicket priority';

CREATE TABLE smart_tag_hidden.owners (
  id integer PRIMARY KEY,
  team_id integer NOT NULL,
  name text NOT NULL
);
COMMENT ON TABLE smart_tag_hidden.owners IS
  '@foreignKey (team_id) references smart_tag_transitive.teams (id)';

CREATE TABLE "Smart_Tag_Quoted"."Reviewers" (
  id integer PRIMARY KEY,
  name text NOT NULL
);

-- Non-ASCII names must be quoted in tags; quoted names are used verbatim.
CREATE TABLE "Smart_Tag_Prüfung".approvers (
  id integer PRIMARY KEY,
  name text NOT NULL
);

-- Named only in description text, which graphile-build-pg does not parse.
CREATE TABLE smart_tag_unrelated.archive (
  id integer PRIMARY KEY
);

CREATE TABLE smart_tag_root.tickets (
  id integer PRIMARY KEY,
  priority text NOT NULL,
  owner_id integer NOT NULL,
  reviewer_id integer,
  approver_id integer
);
COMMENT ON TABLE smart_tag_root.tickets IS E'@foreignKey (priority) references smart_tag_hidden.priority (value)\n@foreignKey (owner_id) REFERENCES SMART_TAG_HIDDEN.OWNERS (ID)|@fieldName assignedOwner\n@foreignKey (reviewer_id) references "Smart_Tag_Quoted"."Reviewers" (id)\n@foreignKey (approver_id) references "Smart_Tag_Prüfung".approvers (id)\nTickets whose foreign keys exist only as smart tags.\n@foreignKey (id) references smart_tag_unrelated.archive (id)';

-- An unqualified target resolves in the tagged view's own schema. A blank line
-- ends the leading tag block, as in pg-introspection's parseSmartComment, so
-- the second line is description text.
CREATE VIEW smart_tag_root.ticket_summaries AS
  SELECT id, owner_id FROM smart_tag_root.tickets;
COMMENT ON VIEW smart_tag_root.ticket_summaries IS
  E'@foreignKey (id) references tickets (id)\n\n@foreignKey (owner_id) references smart_tag_unrelated.archive (id)';

INSERT INTO smart_tag_transitive.teams VALUES (1, 'Synthetic team');
INSERT INTO smart_tag_hidden.priority VALUES ('normal', 'Normal'), ('urgent', 'Urgent');
INSERT INTO smart_tag_hidden.owners VALUES (7, 1, 'Synthetic owner');
INSERT INTO "Smart_Tag_Quoted"."Reviewers" VALUES (3, 'Synthetic reviewer');
INSERT INTO "Smart_Tag_Prüfung".approvers VALUES (5, 'Synthetic approver');
INSERT INTO smart_tag_unrelated.archive VALUES (1);
INSERT INTO smart_tag_root.tickets VALUES (1, 'urgent', 7, 3, 5);
