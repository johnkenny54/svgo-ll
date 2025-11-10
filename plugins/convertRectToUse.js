import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import { AttValue } from '../lib/attrs/attValue.js';
import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { PaintAttValue } from '../lib/attrs/paintAttValue.js';
import { generateId } from '../lib/svgo/tools.js';
import {
  getHrefId,
  getReferencedIds,
  getSVGElement,
} from '../lib/tools-ast.js';
import { createElement } from '../lib/xast.js';
import { CLIP_FILT_MASK } from './_collections.js';

export const name = 'convertRectToUse';
export const description = 'convert identical <rect>s to <use> elements';

/** @type {import('./plugins-types.js').Plugin<'convertRectToUse'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  /** @type {Map<string,{element:import('../lib/types.js').XastElement,gradientIds:string[]}[]>} */
  const rectToElements = new Map();

  /** @type {Set<string>} */
  const currentIds = new Set();

  /** @type {Set<string>} */
  const clipPathUseIds = new Set();

  /** @type {Set<string>} */
  const userSpaceElementIds = new Set();

  /** @type {import('../lib/types.js').XastElement|undefined} */
  let defsElement;

  return {
    element: {
      enter: (element, parentList) => {
        if (element.uri !== undefined) {
          return;
        }

        const id = element.svgAtts.get('id')?.toString();
        if (id) {
          currentIds.add(id);
        }
        getReferencedIds(element).forEach((info) => currentIds.add(info.id));

        switch (element.local) {
          case 'defs':
            defsElement = element;
            return;
          case 'use':
            if (
              element.parentNode.type === 'element' &&
              element.parentNode.local === 'clipPath'
            ) {
              // If it's a child of a <clipPath>, record the id to make sure we maintain direct references.
              const hrefId = getHrefId(element);
              if (hrefId !== undefined) {
                clipPathUseIds.add(hrefId);
              }
            }
            return;
          case 'rect':
            break;
          case 'linearGradient':
          case 'radialGradient':
            if (
              element.svgAtts.get('gradientUnits')?.toString() ===
              'userSpaceOnUse'
            ) {
              const id = element.svgAtts.get('id')?.toString();
              if (id !== undefined) {
                userSpaceElementIds.add(id);
              }
            }
            return;
          case 'pattern':
            if (
              element.svgAtts.get('patternUnits')?.toString() ===
              'userSpaceOnUse'
            ) {
              const id = element.svgAtts.get('id')?.toString();
              if (id !== undefined) {
                userSpaceElementIds.add(id);
              }
            }
            return;
          default:
            return;
        }

        if (
          element.svgAtts.get('rx') !== undefined ||
          element.svgAtts.get('ry') !== undefined
        ) {
          return;
        }

        // Don't convert if the <rect> has clip, mask, or filter; see https://svgwg.org/svg2-draft/struct.html#UseLayout
        const props = styleData.computeOwnStyle(element);
        if (CLIP_FILT_MASK.some((prop) => props.get(prop) !== undefined)) {
          return;
        }

        /** @type {import('../types/types.js').PathAttValue|undefined} */
        const width = element.svgAtts.get('width');
        const height = element.svgAtts.get('height');
        if (width === undefined || height === undefined) {
          return;
        }

        // Save any gradient IDs so we can check them later.
        const inheritedProps = styleData.computeStyle(element, parentList);
        /** @type {string[]} */
        const ids = [];
        if (
          !['fill', 'stroke'].every((propName) => {
            const propVal =
              /** @type {import('../types/types.js').PaintAttValue|null|undefined} */ inheritedProps.get(
                propName,
              );
            if (propVal === undefined) {
              return true;
            }
            if (propVal === null) {
              return false;
            }

            // TODO: get rid of parsing; use styleData.computeProperties() above.
            const attVal = new PaintAttValue(propVal);
            const id = attVal.getReferencedID();
            if (id !== undefined && userSpaceElementIds.has(id)) {
              ids.push(id);
            }
            return true;
          })
        ) {
          return;
        }
        const str = `${width}:${height}`;
        addToMapArray(rectToElements, str, {
          element: element,
          gradientIds: ids,
        });
      },
    },
    root: {
      exit: (root) => {
        /** @type {{id:string,elements:import('../lib/types.js').XastElement[]}[]} */
        const newDefs = [];

        let counter = 0;

        for (const rawElements of rectToElements.values()) {
          const elements = rawElements.filter((element) => {
            const id = element.element.svgAtts.get('id')?.toString();
            if (id !== undefined && clipPathUseIds.has(id)) {
              // Don't convert any <rect>s that are referenced by a <use> in a <clipPath>.
              return false;
            }

            return element.gradientIds.every((id) => {
              return !userSpaceElementIds.has(id);
            });
          });

          if (calculateSavings(elements) <= 0) {
            continue;
          }

          const info = getNextId(counter, currentIds);
          counter = info.nextCounter;
          newDefs.push({
            id: info.nextId,
            elements: elements.map((info) => info.element),
          });
        }

        if (newDefs.length > 0) {
          if (defsElement === undefined) {
            const svg = getSVGElement(root);
            defsElement = createElement(svg, 'defs');
          }
          for (const def of newDefs) {
            const width = def.elements[0].svgAtts.getAtt('width');
            const height = def.elements[0].svgAtts.getAtt('height');
            const atts = new SvgAttMap();
            atts.set('id', new AttValue(def.id));
            atts.set('width', width);
            atts.set('height', height);
            createElement(defsElement, 'rect', '', undefined, atts);

            for (const element of def.elements) {
              element.local = 'use';
              element.svgAtts.set('href', new HrefAttValue('#' + def.id));
              element.svgAtts.delete('width');
              element.svgAtts.delete('height');
            }
          }
        }
      },
    },
  };
};

/**
 * @template T
 * @param {Map<string,T[]>} map
 * @param {string} key
 * @param {T} item
 */
function addToMapArray(map, key, item) {
  let array = map.get(key);
  if (array === undefined) {
    array = [];
    map.set(key, array);
  }
  array.push(item);
}

/**
 * @param {{element:import('../lib/types.js').XastElement}[]} elements
 * @returns {number}
 */
function calculateSavings(elements) {
  if (elements.length < 2) {
    return -1;
  }

  const idLen = 1;
  const width = elements[0].element.svgAtts.getAtt('width').toString();
  const height = elements[0].element.svgAtts.getAtt('height').toString();
  const whLen = width.length + height.length;

  const cost = '<rect id="" width="" height=""/>'.length + idLen + whLen;
  const oldLen = '<rect width="" height=""'.length + whLen;
  const newLen = '<use href="#"'.length + idLen;
  const savings = elements.length * (oldLen - newLen);
  return savings - cost;
}

/**
 * @param {number} counter
 * @param {Set<string>} currentIds
 * @returns {{nextId:string, nextCounter:counter}}
 */
function getNextId(counter, currentIds) {
  let nextId;
  do {
    nextId = generateId(counter++);
  } while (currentIds.has(nextId));

  return { nextId: nextId, nextCounter: counter };
}
