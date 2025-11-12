import { getMatrixEl } from '../types/svgTransforms.js';
import { TransformList } from '../types/transformList.js';

export class CoordTransform {
  /** @type {TransformList} */
  #transforms;

  /** @type {import('../types-transform.js').TransformFnMatrix|null} */
  #matrix;

  /**
   * @param {string|import('../types-transform.js').TransformFn[]} transforms
   */
  constructor(transforms) {
    this.#transforms = new TransformList(transforms);
    const multiplied = this.#transforms.multiply();
    this.#matrix =
      multiplied === undefined ||
      multiplied.length !== 1 ||
      multiplied[0].name !== 'matrix'
        ? null
        : multiplied[0];
  }

  /**
   * @param {import('../../types/types.js').ExactNum} x
   * @param {import('../../types/types.js').ExactNum} y
   * @returns {import('../../types/types.js').ExactNum[]|null}
   */
  transform(x, y) {
    if (this.#matrix === null) {
      return null;
    }
    const x1 = getMatrixEl(
      this.#matrix.a,
      x,
      this.#matrix.c,
      y,
      this.#matrix.e,
    );
    const y1 = getMatrixEl(
      this.#matrix.b,
      y,
      this.#matrix.d,
      x,
      this.#matrix.f,
    );
    return x1 === undefined || y1 === undefined ? null : [x1, y1];
  }
}
