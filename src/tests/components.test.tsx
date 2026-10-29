import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
<<<<<<< HEAD
=======
import React from 'react';
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
import { MemoryRouter } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/fiches/CodeBlock';
import { FicheCard } from '../components/fiches/FicheCard';
import { Fiche } from '../types';

describe('UI Components', () => {
  describe('Badge component', () => {
    it('affiche le libellé correct pour le statut ok', () => {
      render(<Badge status="ok" />);
      expect(screen.getByText(/Confirmée \(contexte défini\)/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut re (à revérifier)', () => {
      render(<Badge status="re" />);
      expect(screen.getByText(/À revérifier/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut fl (signalée)', () => {
      render(<Badge status="fl" />);
      expect(screen.getByText(/Signalée/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut new (récente)', () => {
      render(<Badge status="new" />);
      expect(screen.getByText(/Récente, peu vérifiée/i)).toBeInTheDocument();
    });
  });

  describe('CodeBlock component', () => {
    it('affiche le code et le bouton de copie', () => {
      const sampleCode = 'const wave = new WaveClient({ apiKey: "test" });';
      render(<CodeBlock code={sampleCode} language="JavaScript" />);

      expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument();
      expect(screen.getByText(/Copier le code/i)).toBeInTheDocument();
      expect(screen.getByText(sampleCode)).toBeInTheDocument();
    });

    it('ne rend rien si le code est vide', () => {
      const { container } = render(<CodeBlock code="" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('FicheCard component', () => {
    const mockFiche: Fiche = {
      id: 'f1-test',
      title: 'Tester Wave au Sénégal',
      short_description: 'Créer une session de paiement en quelques minutes',
      problem: 'Problème de test Wave',
      steps: ['Étape 1', 'Étape 2'],
      code_snippet: 'console.log("Wave OK");',
      language: 'Node.js',
      country: 'Sénégal',
      operator_service: 'Wave',
      status: 'published',
      verification_status: 'ok',
      author_id: 'u1',
      confirmations_count: 14,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: 'u1',
        display_name: 'Awa Ndiaye',
        username: 'awa_ndiaye',
        tech_stack: ['Node.js'],
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    it('affiche les informations essentielles de la fiche', () => {
      render(
        <MemoryRouter>
          <FicheCard fiche={mockFiche} />
        </MemoryRouter>
      );

      expect(screen.getByText('Tester Wave au Sénégal')).toBeInTheDocument();
      expect(screen.getByText(/14 confirmations/i)).toBeInTheDocument();
      expect(screen.getByText('Sénégal')).toBeInTheDocument();
      expect(screen.getByText('Wave')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('Awa Ndiaye')).toBeInTheDocument();
    });
  });
});
<<<<<<< HEAD
=======

>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
