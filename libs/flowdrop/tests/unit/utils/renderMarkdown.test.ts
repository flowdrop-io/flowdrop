import { describe, it, expect } from 'vitest';
import { allowedLinkTarget, renderMarkdown } from '$lib/utils/renderMarkdown.js';
import {
  allowedLinkTarget as targetFromDisplay,
  renderMarkdown as fromDisplay
} from '$lib/display/index.js';

/** Parses rendered HTML into a detached container for structural checks. */
function parse(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('renderMarkdown', () => {
  it('is exported from the display entry', () => {
    expect(fromDisplay).toBe(renderMarkdown);
  });

  it('renders paragraphs, emphasis, lists, code and rules', () => {
    const el = parse(
      renderMarkdown(
        [
          'Some **bold**, *em* and _em_ text with `code`.',
          '',
          '- one',
          '- two',
          '',
          '1. first',
          '2. second',
          '',
          '```',
          'a < b',
          '```',
          '',
          '---'
        ].join('\n')
      )
    );
    expect(el.querySelector('p strong')?.textContent).toBe('bold');
    expect(el.querySelectorAll('p em')).toHaveLength(2);
    expect(el.querySelector('p code')?.textContent).toBe('code');
    expect(el.querySelectorAll('ul > li')).toHaveLength(2);
    expect(el.querySelectorAll('ol > li')).toHaveLength(2);
    expect(el.querySelector('pre code')?.textContent).toBe('a < b\n');
    expect(el.querySelector('hr')).not.toBeNull();
  });

  it('keeps heading levels by default and shifts them by headingOffset, up to h6', () => {
    expect(parse(renderMarkdown('# Title')).querySelector('h1')?.textContent).toBe('Title');
    const shifted = parse(renderMarkdown('# A\n\n## B\n\n#### C', { headingOffset: 3 }));
    expect(shifted.querySelector('h4')?.textContent).toBe('A');
    expect(shifted.querySelector('h5')?.textContent).toBe('B');
    expect(shifted.querySelector('h6')?.textContent).toBe('C');
    expect(shifted.querySelector('h1, h2, h3')).toBeNull();
  });

  it('shows HTML in the source as text', () => {
    const el = parse(
      renderMarkdown('<b>x</b> and <img src=x onerror=alert(1)>\n\n<div>block</div>')
    );
    expect(el.querySelector('b, img, div')).toBeNull();
    expect(el.textContent).toContain('<b>x</b>');
    expect(el.textContent).toContain('<div>block</div>');
  });

  it('links http(s), root-relative and fragment targets with rel noopener noreferrer', () => {
    const el = parse(
      renderMarkdown(
        '[a](https://example.com/?x=1&y=2) [b](/node/1) [c](#top) [d](http://example.com)'
      )
    );
    const links = Array.from(el.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://example.com/?x=1&y=2',
      '/node/1',
      '#top',
      'http://example.com'
    ]);
    for (const a of links) {
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('shows the label of a link to any other target as text', () => {
    for (const target of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,x',
      '//example.com',
      '/\\example.com',
      'mailto:a@example.com',
      'vbscript:x'
    ]) {
      const el = parse(renderMarkdown(`[label](${target})`));
      expect(el.querySelector('a'), target).toBeNull();
      expect(el.textContent, target).toContain('label');
    }
    const auto = parse(renderMarkdown('<javascript:alert(1)>'));
    expect(auto.querySelector('a')).toBeNull();
  });

  it('shows an image as a link to its source, under the same target rule', () => {
    const el = parse(renderMarkdown('![pic](https://example.com/a.png) ![bad](javascript:x)'));
    expect(el.querySelector('img')).toBeNull();
    const links = el.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://example.com/a.png');
    expect(links[0].textContent).toBe('pic');
    expect(el.textContent).toContain('bad');
  });

  it('keeps a code span in a link target inside the href value', () => {
    const el = parse(renderMarkdown('[x](https://example.com/`y"onmouseover="alert(1)`)'));
    for (const node of Array.from(el.querySelectorAll('*'))) {
      const names = node.getAttributeNames().filter((n) => n !== 'href' && n !== 'rel');
      expect(names, node.outerHTML).toEqual([]);
    }
    const quoted = parse(renderMarkdown('[`a" onclick="b`](https://example.com)'));
    const a = quoted.querySelector('a');
    expect(a?.getAttributeNames().sort()).toEqual(['href', 'rel']);
    expect(a?.querySelector('code')?.textContent).toBe('a" onclick="b');
  });

  it('returns an empty string for empty or missing input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(undefined as unknown as string)).toBe('');
  });

  it('leaves the shared marked instance untouched', async () => {
    const { marked } = await import('marked');
    renderMarkdown('# x');
    expect(marked.parse('<b>x</b>') as string).toContain('<b>x</b>');
  });
});

describe('allowedLinkTarget', () => {
  it('is exported from the display entry', () => {
    expect(targetFromDisplay).toBe(allowedLinkTarget);
  });

  it('keeps http(s), root-relative and fragment targets, trimmed', () => {
    expect(allowedLinkTarget(' https://example.com/a ')).toBe('https://example.com/a');
    expect(allowedLinkTarget('HTTP://example.com')).toBe('HTTP://example.com');
    expect(allowedLinkTarget('/admin/flowdrop/jobs/1')).toBe('/admin/flowdrop/jobs/1');
    expect(allowedLinkTarget('#top')).toBe('#top');
  });

  it('returns null for any other target, the same targets renderMarkdown shows as text', () => {
    for (const target of [
      'javascript:void(0)',
      ' JaVaScRiPt:void(0)',
      'data:text/html,x',
      '//example.com',
      '/\\example.com',
      'mailto:a@example.com',
      'relative/path',
      '',
      null,
      undefined
    ]) {
      expect(allowedLinkTarget(target), String(target)).toBeNull();
    }
  });
});
