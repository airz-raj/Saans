import axe from 'axe-core';

/**
 * Runs axe-core against a rendered container. Colour contrast is skipped because jsdom
 * does not compute styles; contrast is checked in the browser audit instead.
 */
export async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
}
