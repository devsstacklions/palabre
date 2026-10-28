import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/fiches/CodeBlock';
import { FicheCard } from '../components/fiches/FicheCard';
import { QuestionStatusBadge } from '../components/entraide/QuestionStatusBadge';
import { QuestionCard } from '../components/entraide/QuestionCard';
import { Fiche, Question } from '../types';

describe('UI Components', () => {
  describe('Badge component', () => {
    it('affiche le libellé correct pour le statut ok', () => {
      render(<Badge status="ok" />);
      expect(screen.getByText(/Certifiée par la communauté/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut re (à revérifier)', () => {
      render(<Badge status="re" />);
      expect(screen.getByText(/À revérifier/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut fl (contestée)', () => {
      render(<Badge status="fl" />);
      expect(screen.getByText(/Contestée/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut new (en attente)', () => {
      render(<Badge status="new" />);
      expect(screen.getByText(/En attente de validation/i)).toBeInTheDocument();
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
      negative_feedback_count: 0,
      views_count: 85,
      comments_count: 3,
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

  describe('QuestionStatusBadge component', () => {
    it('affiche le libellé correct pour le statut open', () => {
      render(<QuestionStatusBadge status="open" />);
      expect(screen.getByText(/Ouvert/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut in_progress', () => {
      render(<QuestionStatusBadge status="in_progress" />);
      expect(screen.getByText(/En cours/i)).toBeInTheDocument();
    });

    it('affiche le libellé correct pour le statut resolved', () => {
      render(<QuestionStatusBadge status="resolved" />);
      expect(screen.getByText(/Résolu/i)).toBeInTheDocument();
    });
  });

  describe('QuestionCard component', () => {
    const mockQuestion: Question = {
      id: 'q1-test',
      title: 'Erreur 401 Webhook Wave Checkout Express',
      description: 'La vérification de signature échoue avec le SDK Node.js.',
      technology: 'Node.js',
      framework: 'Express',
      error_message: 'Signature verification failed',
      expected_result: 'Le webhook retourne 200 OK',
      attachments: ['https://example.com/capture.png'],
      status: 'resolved',
      author_id: 'u1',
      answers_count: 3,
      views_count: 42,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: 'u1',
        display_name: 'Moussa Diop',
        username: 'moussa_dev',
        tech_stack: ['Node.js'],
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    it('affiche les informations essentielles du problème', () => {
      render(
        <MemoryRouter>
          <QuestionCard question={mockQuestion} />
        </MemoryRouter>
      );

      expect(screen.getByText('Erreur 401 Webhook Wave Checkout Express')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('Express')).toBeInTheDocument();
      expect(screen.getByText('Moussa Diop')).toBeInTheDocument();
      expect(screen.getByText(/3 rép\./i)).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText(/Signature verification failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Solution trouvée/i)).toBeInTheDocument();
    });
  });
});

