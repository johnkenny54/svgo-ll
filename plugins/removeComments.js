import { detachNodeFromParent } from '../lib/xast.js';

export const name = 'removeComments';
export const description = 'removes comments';

/**
 * If a comment matches one of the following patterns, it will be
 * preserved by default. Particularly for copyright/license information.
 */
const DEFAULT_PRESERVE_PATTERNS = [/^!/];

/**
 * Remove comments.
 *
 * @example
 * <!-- Generator: Adobe Illustrator 15.0.0, SVG Export
 * Plug-In . SVG Version: 6.00 Build 0)  -->
 *
 * @author Kir Belevich
 *
 * @type {import('./plugins-types.js').Plugin<'removeComments'>}
 */
export const fn = (_root, params, info) => {
  if (info.passNumber > 0) {
    return;
  }

  const { preservePatterns = DEFAULT_PRESERVE_PATTERNS } = params;

  return {
    comment: {
      enter: (node, parentNode) => {
        if (preservePatterns) {
          if (!Array.isArray(preservePatterns)) {
            throw Error(
              `Expected array in removeComments preservePatterns parameter but received ${preservePatterns}`,
            );
          }

          const matches = preservePatterns.some((pattern) => {
            return new RegExp(pattern).test(node.value);
          });

          if (matches) {
            return;
          }
        }

        detachNodeFromParent(node, parentNode);
      },
    },
  };
};
