import { generate } from '../src';

describe('generate', () => {
  it('returns a non-empty HTML string', () => {
    const html = generate();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    expect(html).toMatch(/<!DOCTYPE|<\s*html/i);
  });

  it('uses default content when called with no options', () => {
    const html = generate();
    expect(html).toContain('Acme, Inc.');
    expect(html).toContain('support@example.com');
  });

  it('embeds title in output', () => {
    const html = generate({ title: 'Confirm your email' });
    expect(html).toContain('Confirm your email');
  });

  it('embeds message in output', () => {
    const html = generate({ message: 'Please click the button below.' });
    expect(html).toContain('Please click the button below.');
  });

  it('embeds link and linkText in output', () => {
    const html = generate({
      link: 'https://example.com/confirm',
      linkText: 'Confirm now'
    });
    expect(html).toContain('https://example.com/confirm');
    expect(html).toContain('Confirm now');
  });

  it('embeds companyName and supportEmail in output', () => {
    const html = generate({
      companyName: 'Acme Corp',
      supportEmail: 'help@acme.com'
    });
    expect(html).toContain('Acme Corp');
    expect(html).toContain('help@acme.com');
  });

  it('embeds subMessage when provided as string', () => {
    const html = generate({
      message: 'Hello',
      subMessage: 'Extra line here.'
    });
    expect(html).toContain('Extra line here.');
  });

  it('includes header logo link when website and logo are set', () => {
    const html = generate({
      website: 'https://acme.com',
      logo: 'https://acme.com/logo.png'
    });
    expect(html).toContain('https://acme.com');
    expect(html).toContain('https://acme.com/logo.png');
  });

  it('includes "or copy and paste" fallback text for link', () => {
    const html = generate({ link: 'https://x.com' });
    expect(html).toContain('or copy and paste this link');
    expect(html).toContain('https://x.com');
  });
});
