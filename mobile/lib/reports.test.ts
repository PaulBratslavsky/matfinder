import { describe, expect, it } from 'vitest';
import { messageProblem, reportErrorMessage } from './reports';

describe('report a problem', () => {
  it('server refusals', () => {
    expect(reportErrorMessage('REPORT_OPEN', 'x')).toBe("You already reported a problem with this gym. We'll look at it soon.");
    expect(reportErrorMessage('TOO_MANY_REPORTS', 'x')).toBe("You have several open reports. We'll get to them first.");
    expect(reportErrorMessage(undefined, 'Server says no')).toBe('Server says no');
    expect(reportErrorMessage('SOMETHING_NEW', 'Server says no')).toBe('Server says no');
  });
  it('"Something else" needs a message', () => {
    expect(messageProblem('other', '  ')).toBe("Tell us what's wrong.");
    expect(messageProblem('other', 'The gym moved')).toBeNull();
    expect(messageProblem('schedule', '')).toBeNull();
  });
});
