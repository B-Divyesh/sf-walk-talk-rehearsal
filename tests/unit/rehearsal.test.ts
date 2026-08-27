import { describe, expect, it } from 'vitest';
import { DAY_MS, isDue, nextReplayAt, promptLines } from '../../src/rehearsal';

describe('rehearsal scheduling', () => {
  it('treats new and elapsed prompts as due', () => {
    expect(isDue(undefined, 100)).toBe(true);
    expect(isDue(99, 100)).toBe(true);
    expect(isDue(101, 100)).toBe(false);
  });

  it('uses deliberate replay intervals', () => {
    expect(nextReplayAt(3, 1_000)).toBe(1_000 + 3 * DAY_MS);
    expect(() => nextReplayAt(2, 1_000)).toThrow(RangeError);
  });

  it('turns non-empty lines into prompts', () => {
    expect(promptLines('  First cue  \n\nSecond cue\n')).toEqual(['First cue', 'Second cue']);
  });
});
