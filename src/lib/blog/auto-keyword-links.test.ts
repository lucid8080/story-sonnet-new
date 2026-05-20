import { describe, expect, it } from 'vitest';
import {
  applyAutoKeywordLinks,
  filterTargetsPresentInText,
  phraseMatchRegex,
  type AutoLinkTarget,
} from '@/lib/blog/auto-keyword-links';

const storyTarget = (
  phrase: string,
  slug: string,
  score = 10
): AutoLinkTarget => ({
  phrase,
  normalizedPhrase: phrase.toLowerCase(),
  href: `/story/${slug}`,
  kind: 'story',
  label: phrase,
  score,
});

describe('phraseMatchRegex', () => {
  it('matches multi-word phrases with flexible spacing', () => {
    const re = phraseMatchRegex('Lantern Library');
    expect(re).not.toBeNull();
    re!.lastIndex = 0;
    const m = re!.exec('Visit the Lantern Library today.');
    expect(m?.[1]).toBe('Lantern Library');
  });
});

describe('applyAutoKeywordLinks', () => {
  it('links the first occurrence in a paragraph', () => {
    const html = '<p>Juniper loves the Lantern Library at night.</p>';
    const targets: AutoLinkTarget[] = [
      storyTarget('Lantern Library', 'juniper-lantern-library'),
    ];
    const { html: out, applied } = applyAutoKeywordLinks(html, targets);
    expect(out).toContain(
      '<a href="/story/juniper-lantern-library"'
    );
    expect(out).toContain('Lantern Library</a>');
    expect(applied).toHaveLength(1);
    expect(applied[0]?.count).toBe(1);
  });

  it('does not link inside existing anchors', () => {
    const html =
      '<p>Read <a href="/blog/other">Lantern Library</a> for more.</p>';
    const targets: AutoLinkTarget[] = [
      storyTarget('Lantern Library', 'juniper-lantern-library'),
    ];
    const { html: out, applied } = applyAutoKeywordLinks(html, targets);
    expect(out).toBe(html);
    expect(applied).toHaveLength(0);
  });

  it('does not link inside headings', () => {
    const html = '<h2>Lantern Library</h2><p>About the Lantern Library.</p>';
    const targets: AutoLinkTarget[] = [
      storyTarget('Lantern Library', 'juniper-lantern-library'),
    ];
    const { html: out } = applyAutoKeywordLinks(html, targets);
    expect(out).toMatch(/<h2>Lantern Library<\/h2>/);
    expect(out).toContain('<a href="/story/juniper-lantern-library"');
  });

  it('prefers longer phrases first', () => {
    const html = '<p>Explore the Lantern Library collection.</p>';
    const targets: AutoLinkTarget[] = [
      storyTarget('Library', 'short', 5),
      storyTarget('Lantern Library', 'long', 10),
    ];
    const { html: out } = applyAutoKeywordLinks(html, targets, {
      maxPerPhrase: 1,
    });
    expect(out).toContain('/story/long');
    expect(out).not.toContain('/story/short');
  });

  it('adds nofollow on external links', () => {
    const html = '<p>We recommend Calm for sleep.</p>';
    const targets: AutoLinkTarget[] = [
      {
        phrase: 'Calm',
        normalizedPhrase: 'calm',
        href: 'https://www.calm.com/',
        kind: 'external',
        label: 'Calm',
        score: 10,
      },
    ];
    const { html: out } = applyAutoKeywordLinks(html, targets);
    expect(out).toContain('nofollow');
    expect(out).toContain('https://www.calm.com/');
  });
});

describe('filterTargetsPresentInText', () => {
  it('keeps only phrases that appear in body text', () => {
    const targets: AutoLinkTarget[] = [
      storyTarget('Lantern Library', 'a'),
      storyTarget('Pocket Meadow', 'b'),
    ];
    const filtered = filterTargetsPresentInText(
      targets,
      'A tale about the Lantern Library.'
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.href).toBe('/story/a');
  });
});
