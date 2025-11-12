import { ExactNum } from '../../lib/exactnum.js';
import { CoordTransform } from '../../lib/svgo/coordTransform.js';

const tests = [{ transform: '', in: [0, 0], expected: [10, 260] }];

for (const test of tests) {
  it(test.transform, () => {
    const t = new CoordTransform(test.transform);
    const out = t.transform(new ExactNum(test.in[0]), new ExactNum(test.in[1]));
    if (out === null) {
      expect(out).toBeNull();
    } else {
      expect(out[0]).toBe(test.expected[0]);
      expect(out[1]).toBe(test.expected[1]);
    }
  });
}
