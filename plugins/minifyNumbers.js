import { isNumber } from '../lib/svgo/tools.js';

export const name = 'minifyNumbers';
export const description = 'minifies numeric values in attributes';

/**
 * @type {import('./plugins-types.js').Plugin<'minifyColors'>};
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector()
  ) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        for (const [attName, attValue] of Object.entries(element.attributes)) {
          switch (attName) {
            case 'height':
            case 'width':
            case 'x':
            case 'y':
              if (typeof attValue === 'string') {
                element.attributes[attName] = removePx(attValue);
              }
              break;
          }
        }
      },
    },
  };
};

/**
 * @param {string} attValue
 * @returns {string}
 */
export function removePx(attValue) {
  for (let index = attValue.length - 1; index >= 0; index--) {
    const c = attValue[index];
    if (c === ' ') {
      continue;
    }
    if (c === 'x') {
      if (attValue[index - 1] === 'p') {
        const num = attValue.substring(0, index - 1);
        return isNumber(num) ? num : attValue;
      }
    }
    break;
  }
  return attValue;
}
