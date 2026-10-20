import { describe, expect, it } from 'vitest';
import { boundingBox, clampRadius, coordsOf, haversineMiles, parseCoords, roundMiles } from '../../src/lib/radius';

const VEGAS = { latitude: 36.1699, longitude: -115.1398 };
const HENDERSON = { latitude: 36.0395, longitude: -115.0457 };
const WEST_HARTFORD = { latitude: 41.762, longitude: -72.742 };

describe('haversineMiles', () => {
  it('is zero for the same point and symmetric', () => {
    expect(haversineMiles(VEGAS, VEGAS)).toBe(0);
    expect(haversineMiles(VEGAS, HENDERSON)).toBeCloseTo(haversineMiles(HENDERSON, VEGAS), 9);
  });

  it('matches known distances', () => {
    // Las Vegas to Henderson's sample gym: about 10.4 mi; Las Vegas to West Hartford, CT: about 2,260 mi.
    expect(haversineMiles(VEGAS, HENDERSON)).toBeGreaterThan(10);
    expect(haversineMiles(VEGAS, HENDERSON)).toBeLessThan(11);
    expect(haversineMiles(VEGAS, WEST_HARTFORD)).toBeGreaterThan(2200);
    expect(haversineMiles(VEGAS, WEST_HARTFORD)).toBeLessThan(2350);
  });
});

describe('boundingBox', () => {
  it('contains every point within the radius', () => {
    const box = boundingBox(VEGAS, 25);
    // Points 24.9 mi due north, south, east and west (and on the diagonals) are inside the box.
    for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const b = (bearing * Math.PI) / 180;
      const p = { latitude: VEGAS.latitude + (24.9 / 69) * Math.cos(b), longitude: VEGAS.longitude + (24.9 / (69 * Math.cos((VEGAS.latitude * Math.PI) / 180))) * Math.sin(b) };
      expect(p.latitude).toBeGreaterThanOrEqual(box.minLat);
      expect(p.latitude).toBeLessThanOrEqual(box.maxLat);
      expect(p.longitude).toBeGreaterThanOrEqual(box.minLng);
      expect(p.longitude).toBeLessThanOrEqual(box.maxLng);
    }
  });

  it('stays within valid latitudes and longitudes', () => {
    const box = boundingBox({ latitude: 89.99, longitude: 179.9 }, 100);
    expect(box.maxLat).toBe(90);
    expect(box.minLng).toBe(-180);
    expect(box.maxLng).toBe(180);
  });
});

describe('parseCoords', () => {
  it('reads numbers and numeric strings', () => {
    expect(parseCoords('36.17', '-115.14')).toEqual({ latitude: 36.17, longitude: -115.14 });
    expect(parseCoords(36.17, -115.14)).toEqual({ latitude: 36.17, longitude: -115.14 });
  });

  it('rejects missing, non-numeric and out-of-range values', () => {
    expect(parseCoords(undefined, '-115')).toBeNull();
    expect(parseCoords('abc', '-115')).toBeNull();
    expect(parseCoords('', '')).toBeNull();
    expect(parseCoords('91', '0')).toBeNull();
    expect(parseCoords('0', '-181')).toBeNull();
    expect(parseCoords(['36'], '-115')).toBeNull();
  });
});

describe('clampRadius', () => {
  it('defaults to 25 and clamps to 1-100', () => {
    expect(clampRadius(undefined)).toBe(25);
    expect(clampRadius('')).toBe(25);
    expect(clampRadius('10')).toBe(10);
    expect(clampRadius('0.5')).toBe(1);
    expect(clampRadius('500')).toBe(100);
  });

  it('is null for zero, negative or non-numeric radii', () => {
    expect(clampRadius('0')).toBeNull();
    expect(clampRadius('-5')).toBeNull();
    expect(clampRadius('far')).toBeNull();
  });
});

describe('coordsOf', () => {
  it('reads a map-box value as an object or JSON text', () => {
    const value = { longitude: -115.1398, latitude: 36.1699, address: 'Las Vegas, NV', zoom: 10.5, pitch: 0, bearing: 0 };
    expect(coordsOf(value)).toEqual(VEGAS);
    expect(coordsOf(JSON.stringify(value))).toEqual(VEGAS);
  });

  it('is null without valid coordinates', () => {
    expect(coordsOf(null)).toBeNull();
    expect(coordsOf('not json')).toBeNull();
    expect(coordsOf({ address: 'somewhere' })).toBeNull();
    expect(coordsOf({ latitude: 120, longitude: 0 })).toBeNull();
  });
});

describe('roundMiles', () => {
  it('keeps one decimal', () => {
    expect(roundMiles(4.249)).toBe(4.2);
    expect(roundMiles(4.25)).toBe(4.3);
  });
});
