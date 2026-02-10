declare module 'mjml-react' {
  import type { ReactNode } from 'react';

  export function render(
    element: ReactNode,
    options?: { validationLevel?: 'strict' | 'soft' | 'skip' }
  ): { html: string; errors: Array<{ message: string }> };

  export const Mjml: React.FC<{ children?: ReactNode }>;
  export const MjmlHead: React.FC<{ children?: ReactNode }>;
  export const MjmlTitle: React.FC<{ children?: ReactNode }>;
  export const MjmlPreview: React.FC<{ children?: ReactNode }>;
  export const MjmlBody: React.FC<{ backgroundColor?: string; children?: ReactNode }>;
  export const MjmlSection: React.FC<Record<string, unknown> & { children?: ReactNode }>;
  export const MjmlColumn: React.FC<Record<string, unknown> & { children?: ReactNode }>;
  export const MjmlText: React.FC<Record<string, unknown> & { children?: ReactNode }>;
  export const MjmlButton: React.FC<Record<string, unknown> & { children?: ReactNode }>;
  export const MjmlImage: React.FC<Record<string, unknown>>;
}
