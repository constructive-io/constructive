// Risk sentences several Authz nodes share. Not exported from ./index: allNodeTypes is built from Object.values of
// that module.

export const ACTIVE_MEMBER_RISK =
  'Only active members count: approved and not banned or disabled (app members must also be verified). ' +
  'New app members start unapproved unless the app changes its defaults.';

// Policy subqueries run as the person, so the other table's own policies apply.
export const OTHER_TABLE_RISK = 'It reads another table as the person, so only the rows of that table the person can see count.';

// Every user owns a personal organization whose id is their user id.
export const PERSONAL_ORG_RISK =
  'Every person also has an organization of their own (its id is their user id), so any active member of the app passes for rows that name it.';

// Only team memberships carry a read-only flag.
export const NO_APP_READ_ONLY_RISK = 'Only team memberships carry a read-only flag, so this policy lets a person who is read-only in a team through.';

export const AGENT_IDENTITY_RISK =
  'The check compares the column with the signed-in identity. An agent key with its own identity is not the ' +
  'person who made the key, so it does not reach that person\'s rows, and a row it creates must name the agent.';
