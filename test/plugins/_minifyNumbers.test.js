import { removePx } from '../../plugins/minifyNumbers.js';

describe('test for significant whitespace', () => {
  /** @type {{in:string,out?:string}[]} */
  const testCases = [
    { in: '' },
    { in: 'px' },
    { in: 'xpx' },
    { in: '20px', out: '20' },
    { in: '20px  ', out: '20' },
  ];

  for (const testCase of testCases) {
    it(`${JSON.stringify(testCase.in)}`, () => {
      expect(removePx(testCase.in)).toBe(testCase.out ?? testCase.in);
    });
  }
});
