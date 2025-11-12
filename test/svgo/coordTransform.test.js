import { ExactNum } from '../../lib/exactnum.js';
import { CoordTransform } from '../../lib/svgo/coordTransform.js';

const tests = [
  {
    transform: 'translate(10, 260) rotate(-90)',
    in: [0, 0],
    expected: [10, 260],
  },
  // No exact transform.
  {
    transform: 'translate(10, 260) rotate(-9)',
    in: [0, 0],
    expected: null,
  },
];

for (const test of tests) {
  it(test.transform, () => {
    const t = new CoordTransform(test.transform);
    const out = t.transform(new ExactNum(test.in[0]), new ExactNum(test.in[1]));
    if (out === null) {
      expect(test.expected).toBeNull();
    } else if (test.expected === null) {
      expect(out).toBeNull();
    } else {
      expect(out[0].getValue()).toBe(test.expected[0]);
      expect(out[1].getValue()).toBe(test.expected[1]);
    }
  });
}
