export const resolveIntrospectionSettings = (
  introspectionJit: boolean,
  settings: Record<string, string | undefined> | null | undefined
): Record<string, string | undefined> => ({
  ...settings,
  jit: introspectionJit ? 'on' : 'off',
});
