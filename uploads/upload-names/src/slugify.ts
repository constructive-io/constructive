export default (text: string) => {
  text = text.toString().trim();
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return text
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/--+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '')
    || 'unnamed';
};