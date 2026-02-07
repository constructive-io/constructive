# Code Generation Rules

## 1. Only AST-based code generation

All per-schema/per-table code generation MUST use Babel AST (`@babel/types` + `generateCode()`).
Never use `lines.push()`, string concatenation, or template literals to build generated TypeScript code.

Reference implementations:
- `src/core/codegen/orm/model-generator.ts` — per-table ORM model classes
- `src/core/codegen/orm/client-generator.ts` — createClient factory
- `src/core/codegen/orm/custom-ops-generator.ts` — custom query/mutation operations

## 2. Never any string-based concatenation

No `lines.push(...)`, no backtick template literals containing code, no string `+` operators
for building generated source files. If you find yourself writing `lines.push(\`import ...\`)`,
stop and use `t.importDeclaration(...)` instead.

## 3. Giant templates must be actual files that get copied

Static runtime code that does not vary per-schema belongs in `src/core/codegen/templates/`
as real `.ts` files. These are read at codegen time via `readTemplateFile()` and written
to the output directory with only the header replaced.

This gives you:
- Syntax highlighting and IDE support while editing templates
- A clear boundary between "code that generates code" and "code that IS the output"

Reference implementations:
- `src/core/codegen/templates/orm-client.ts`
- `src/core/codegen/templates/query-builder.ts`
- `src/core/codegen/templates/select-types.ts`
