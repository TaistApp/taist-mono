import { toFormData } from '../../app/utils/formData';

/**
 * A recorder standing in for the platform FormData, so the assertions do not
 * depend on whichever implementation the test environment provides.
 */
class RecordingFormData {
  parts: Array<[string, any]> = [];
  append(key: string, value: any) {
    this.parts.push([key, value]);
  }
}

const original = (global as any).FormData;
beforeAll(() => {
  (global as any).FormData = RecordingFormData;
});
afterAll(() => {
  (global as any).FormData = original;
});

const parts = (fd: unknown) => (fd as RecordingFormData).parts;
const keys = (fd: unknown) => parts(fd).map(([k]) => k);
const valueFor = (fd: unknown, key: string) =>
  parts(fd).find(([k]) => k === key)?.[1];

/**
 * FormData stringifies whatever it is handed, so a null field reached the
 * server as the literal text "null" and was stored — which is how an order
 * rendered "8755 Lindsey Ct, null". Every nullable field was affected, not
 * just address2.
 */
describe('toFormData', () => {
  it('omits null and undefined instead of sending the text "null"', () => {
    const fd = toFormData({ address: '8755 Lindsey Ct', address2: null, phone: undefined });

    expect(keys(fd)).toEqual(['address']);
    expect(valueFor(fd, 'address2')).toBeUndefined();
  });

  it('never stringifies a null into the body', () => {
    const fd = toFormData({ a: null, b: undefined, c: 'real' });

    for (const [, v] of parts(fd)) {
      expect(v).not.toBe('null');
      expect(v).not.toBe('undefined');
    }
  });

  // Control: genuine falsy values are real data and must survive.
  it('keeps 0, false and empty string', () => {
    const fd = toFormData({ zero: 0, no: false, blank: '' });

    expect(keys(fd).sort()).toEqual(['blank', 'no', 'zero']);
    expect(valueFor(fd, 'zero')).toBe(0);
    expect(valueFor(fd, 'no')).toBe(false);
  });
});
