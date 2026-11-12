import { describe, expect, it } from 'vitest';
import {
  distanceMeters,
  findDuplicates,
  instagramKey,
  phoneKey,
  sameSite,
  similarNames,
  type ExistingGym,
} from '../../src/plugins/matfinder/server/src/domain/duplicates';

const summerlin: ExistingGym = {
  documentId: 'd1',
  slug: 'sample-summerlin-bjj-demo',
  name: 'Sample Summerlin BJJ (Demo)',
  phone: '702-555-0101',
  website: 'example.com/summerlin-bjj',
  instagram: '@sample_summerlin_bjj',
  latitude: 36.1517,
  longitude: -115.3319,
};
const henderson: ExistingGym = { documentId: 'd2', slug: 'sample-henderson-grappling-demo', name: 'Sample Henderson Grappling (Demo)', latitude: 36.03, longitude: -115.04 };

describe('duplicate signals', () => {
  it('names: generic BJJ words are ignored; most words shared, or all of one name inside the other', () => {
    expect(similarNames('Summerlin BJJ', 'Sample Summerlin BJJ (Demo)')).toBe(true); // every distinctive word of the shorter name
    expect(similarNames('Summerlin Muay Thai', 'Henderson Muay Thai')).toBe(false); // 2 of 4 shared, neither inside the other
    expect(similarNames('Sample Summerlin Brazilian Jiu-Jitsu Academy', 'Sample Summerlin BJJ (Demo)')).toBe(true);
    expect(similarNames('Gracie Barra Summerlin', 'Summerlin')).toBe(true);
    expect(similarNames('Henderson Grappling', 'Garage Grappling')).toBe(false);
    expect(similarNames('Jiu-Jítsu Academy', 'jiu jitsu academy')).toBe(true);
  });
  it('phones, websites and Instagram handles are compared normalized', () => {
    expect(phoneKey('+1 (702) 555-0101')).toBe(phoneKey('702.555.0101'));
    expect(phoneKey('12')).toBeNull();
    expect(sameSite('https://www.SummerlinBJJ.com/schedule', 'summerlinbjj.com')).toBe(true);
    expect(sameSite('example.com/summerlin-bjj', 'https://example.com/strip-jj')).toBe(false); // a shared host, different pages
    expect(sameSite('facebook.com/summerlinbjj', 'https://www.facebook.com/summerlinbjj/')).toBe(true);
    expect(sameSite('facebook.com/summerlinbjj', 'facebook.com/otherbjj')).toBe(false);
    expect(sameSite('facebook.com', 'facebook.com')).toBe(false);
    expect(instagramKey('https://www.instagram.com/Sample_Summerlin_BJJ/')).toBe(instagramKey('@sample_summerlin_bjj'));
  });
  it('distance', () => {
    expect(distanceMeters({ latitude: 36.1517, longitude: -115.3319 }, { latitude: 36.1517, longitude: -115.3319 })).toBe(0);
    expect(Math.round(distanceMeters({ latitude: 36, longitude: -115 }, { latitude: 36.001, longitude: -115 }))).toBe(111);
  });
});

describe('findDuplicates', () => {
  it('lists each matching gym with every reason, strongest first', () => {
    const found = findDuplicates(
      { name: 'Summerlin Gracie', phone: '(702) 555-0101', instagram: 'instagram.com/sample_summerlin_bjj', latitude: 36.1518, longitude: -115.332 },
      [henderson, summerlin],
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ slug: 'sample-summerlin-bjj-demo' });
    expect(found[0].reasons).toEqual(['same phone', 'same Instagram', expect.stringMatching(/^\d+ m away$/)]);
  });
  it('names: false skips the name signal (other cities) but keeps the identity signals', () => {
    expect(findDuplicates({ name: 'Sample Summerlin BJJ (Demo)' }, [summerlin], { names: false })).toEqual([]);
    expect(findDuplicates({ name: 'X', phone: '702-555-0101' }, [summerlin], { names: false })[0].reasons).toEqual(['same phone']);
  });

  it('nothing in common → no candidates', () => {
    expect(findDuplicates({ name: 'Desert Fox Grappling', latitude: 36.3, longitude: -115.2 }, [summerlin, henderson])).toEqual([]);
  });
});
