export { ButtonWithMessage } from './components/ButtonWithMessage';
export { Footer } from './components/Footer';
export { Header } from './components/Header';
export type {
  ButtonWithMessageProps,
  FooterProps,
  GenerateOptions,
  HeaderImageProps,
  HeaderProps
} from './types';

import { render } from 'mjml-react';

import { buildEmailElement } from './template';
import type { GenerateOptions } from './types';

/**
 * Generate email HTML from MJML template with header, message + button, and footer.
 */
export function generate(options: GenerateOptions = {}): string {
  const { html } = render(buildEmailElement(options), {
    validationLevel: 'soft'
  });
  return html;
}
