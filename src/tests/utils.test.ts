import { describe, it, expect } from 'vitest';
import { formatRelativeDate, cn } from '../lib/utils';

describe('Utility Functions', () => {
  describe('cn (Tailwind class merger)', () => {
    it('combine correctement les classes conditionnelles', () => {
      expect(cn('bg-red-500', true && 'text-white', false && 'hidden')).toBe('bg-red-500 text-white');
    });

    it('résout les conflits Tailwind correctement', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
  });

  describe('formatRelativeDate', () => {
    it('renvoie "Inconnue" si date nulle', () => {
      expect(formatRelativeDate(null)).toBe('Inconnue');
      expect(formatRelativeDate(undefined)).toBe('Inconnue');
    });

    it('renvoie "À l\'instant" pour une date très récente', () => {
      const now = new Date().toISOString();
      expect(formatRelativeDate(now)).toBe("À l'instant");
    });

    it('renvoie "hier" pour une date d’hier', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000 - 1000).toISOString();
      expect(formatRelativeDate(yesterday)).toBe('hier');
    });

    it('renvoie le nombre de jours pour une date de 3 jours', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1000).toISOString();
      expect(formatRelativeDate(threeDaysAgo)).toBe('il y a 3 j');
    });
  });
});

