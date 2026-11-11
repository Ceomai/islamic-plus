import { describe, expect, it } from '@jest/globals';
import { fallBackToSystemArabicFont, fontFamily, type } from '../theme/tokens';

describe('Arabic fonts', () => {
  it('uses Amiri Quran for the Quran and Noto Naskh Arabic elsewhere, with room for marks', () => {
    expect(type.arabicQuran.fontFamily).toBe(fontFamily.quran);
    expect(type.arabicDua.fontFamily).toBe(fontFamily.arabic);
    expect(type.arabicPreview.fontFamily).toBe(fontFamily.arabic);
    expect(type.arabicQuran.lineHeight! / type.arabicQuran.fontSize!).toBeGreaterThanOrEqual(1.9);
    expect(type.arabicDua.lineHeight! / type.arabicDua.fontSize!).toBeGreaterThanOrEqual(1.75);
  });

  it('falls back to the system font when the files cannot load', () => {
    fallBackToSystemArabicFont();
    expect(type.arabicQuran.fontFamily).toBeUndefined();
    expect(type.arabicDua.fontFamily).toBeUndefined();
    expect(type.body.fontFamily).toBe(fontFamily.ui);
  });
});
