# OAuth/SSO Platform Integration Working Draft

Use this document only for active design discussion, alternatives, evidence, and unresolved questions. Once a decision is confirmed, promote the resulting requirement to [`oauth-sso-platform-integration.md`](./oauth-sso-platform-integration.md) and remove it from this draft.

The formal specification is the sole authoritative record of confirmed design decisions.

## Active Discussion Notes

No active discussion notes.

## Candidate Designs and Suggested Values

### Future Initialization Consideration: Provider Templates

**Status:** Candidate initialization convenience only; not a current formal-specification decision.

When an `auth:sso`-style Tenant preset provisions identity-provider support, it may seed disabled, non-secret Google and GitHub Provider templates with their standard endpoints, baseline scopes, and PKCE enabled. It must not seed client IDs or client secrets and must not enable either Provider. An administrator must supply the Provider credentials through the existing configuration and secret owners, then explicitly enable the Provider.

## Open Questions

No open questions.
