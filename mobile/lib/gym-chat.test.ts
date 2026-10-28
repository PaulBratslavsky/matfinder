import { describe, expect, it } from 'vitest';
import type { SchoolPage } from './api/schools';
import { ANSWER_NOTES, chatErrorView, gymChatPath, messageText, suggestedQuestions } from './gym-chat';

type Gym = Pick<SchoolPage, 'pricing' | 'schedule'>;
const session = (classType: string, style: string) => ({ day: 'mon', start: '18:00', end: '19:00', classType, style, notes: null }) as SchoolPage['schedule'][number];
const pricing = (over: Partial<NonNullable<SchoolPage['pricing']>> = {}): SchoolPage['pricing'] => ({
  visitorsWelcome: true,
  dropInFee: 25,
  dropInNotes: null,
  freeTrial: false,
  freeTrialNotes: null,
  monthlyMin: null,
  monthlyMax: null,
  currency: 'USD',
  ...over,
});

describe('suggested questions', () => {
  it('asks about dropping in with the price, a beginner class, a gi and kids classes when the gym has them', () => {
    const gym: Gym = { pricing: pricing(), schedule: [session('fundamentals', 'gi'), session('kids', 'gi')] };
    expect(suggestedQuestions(gym)).toEqual(['Can I drop in, and what does it cost?', "When's the next beginner class?", 'Do I need a gi?', 'Do they have kids classes?']);
  });

  it('leaves out dropping in when visitors are not welcome, and asks what to wear at a no-gi gym', () => {
    const gym: Gym = { pricing: pricing({ visitorsWelcome: false }), schedule: [session('advanced', 'nogi')] };
    expect(suggestedQuestions(gym)).toEqual(['What should I wear?', 'Is there parking?']);
  });

  it('asks plainly about visiting when there is no drop-in price, and never more than four', () => {
    const gym: Gym = { pricing: null, schedule: [session('all_levels', 'both'), session('kids', 'both')] };
    const questions = suggestedQuestions(gym);
    expect(questions[0]).toBe('Can I drop in as a visitor?');
    expect(questions).toHaveLength(4);
  });
});

describe('chat errors in words', () => {
  it('shows the server’s own words for its codes', () => {
    expect(chatErrorView(Object.assign(new Error("You've asked a lot of questions today. Try again tomorrow."), { code: 'daily_limit' }))).toEqual({
      text: "You've asked a lot of questions today. Try again tomorrow.",
      newChat: false,
    });
    expect(chatErrorView(Object.assign(new Error('This chat is long. Start a new one to keep asking.'), { code: 'chat_too_long' }))?.newChat).toBe(true);
  });

  it('asks to sign in again when the session was refused, on the web and on native', () => {
    expect(chatErrorView(new Error('HTTP error! status: 403 Forbidden'))).toMatchObject({ signIn: true });
    expect(chatErrorView(new Error('XHR error! status: 401 Unauthorized'))).toMatchObject({ signIn: true });
  });

  it('calls a dropped connection a dropped connection, and anything else something went wrong', () => {
    expect(chatErrorView(Object.assign(new Error('XHR request failed'), { name: 'StreamReadError' }))?.text).toMatch(/Lost the connection/);
    expect(chatErrorView(new TypeError('Failed to fetch'))?.text).toMatch(/Lost the connection/);
    expect(chatErrorView(new Error('HTTP error! status: 500 Internal Server Error'))?.text).toBe('Something went wrong. Try again.');
  });

  it('says nothing for a stopped answer or no error', () => {
    expect(chatErrorView(Object.assign(new Error('aborted'), { name: 'AbortError' }))).toBeNull();
    expect(chatErrorView(undefined)).toBeNull();
  });
});

describe('chat helpers', () => {
  it('joins a message’s text parts and skips the rest', () => {
    expect(messageText({ parts: [{ type: 'thinking', content: 'hm' }, { type: 'text', content: 'Free ' }, { type: 'text', content: 'parking.' }] })).toBe('Free parking.');
  });
  it('builds the route and has a note for each custom event the server sends', () => {
    expect(gymChatPath('sample-garage-grappling-demo')).toBe('/api/matfinder/schools/sample-garage-grappling-demo/chat');
    expect(Object.keys(ANSWER_NOTES).sort()).toEqual(['cut_off', 'declined']);
  });
});
