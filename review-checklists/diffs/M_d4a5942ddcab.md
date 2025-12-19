# Diff — `M` `packages/cli/src/utils/display.ts`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Numstat: `+7/-7`
- Reproduce: `git diff main...HEAD -- packages/cli/src/utils/display.ts`

## Guideline token summary
- Deltas: `lql`: 6 → 0; `cnc`: 0 → 4; `constructive`: 0 → 3; `launchql`: 1 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

```text
  Usage: lql <command> [options]										      |	  Usage: cnc <command> [options]
         launchql <command> [options]										      |	         constructive <command> [options]
    lql <command> --help    Display detailed help for specific command						      |	    constructive <command> --help    Display detailed help for specific command
    lql <command> -h        Display detailed help for specific command						      |	    constructive <command> -h        Display detailed help for specific command
    lql deploy --help       Show deploy command options								      |	    cnc deploy --help       Show deploy command options
    lql server --port 8080  Start server on port 8080								      |	    cnc server --port 8080  Start server on port 8080
    lql init workspace      Initialize new workspace								      |	    cnc init workspace      Initialize new workspace
```
