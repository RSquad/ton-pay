type StyleInjectOptions = {
  insertAt?: 'top' | 'bottom';
  attributes?: Record<string, string>;
};

export default function styleInject(
  css: string,
  options: StyleInjectOptions = {},
) {
  if (!css) return;
  if (typeof document === 'undefined') return;

  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;

  const style = document.createElement('style');
  style.type = 'text/css';

  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      style.setAttribute(key, value);
    }
  }

  if ('styleSheet' in style) {
    (
      style as unknown as { styleSheet: { cssText: string } }
    ).styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }

  const insertAt = options.insertAt ?? 'bottom';
  if (insertAt === 'top' && head.firstChild) {
    head.insertBefore(style, head.firstChild);
  } else {
    head.appendChild(style);
  }

  return style;
}
