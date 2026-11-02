import { describe, it, expect } from 'vitest';
import { ficheFormSchema } from '../schemas/fiche.schema';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { confirmationSchema, reportSchema, variantSchema } from '../schemas/interaction.schema';
import { questionFormSchema, answerFormSchema, questionReportSchema } from '../schemas/entraide.schema';

describe('Validation Schemas (Zod)', () => {
  describe('ficheFormSchema', () => {
    it('valide une fiche complète et correcte', () => {
      const validData = {
        title: 'Intégrer Wave dans une application web au Sénégal',
        problem: 'Comment initialiser une session de paiement Wave Checkout et traiter le webhook de retour.',
        country: 'Sénégal',
        operator_service: 'Wave',
        language: 'Node.js',
        steps: '1. Créer la session côté serveur\n2. Rediriger le client\n3. Traiter le webhook',
        code_snippet: 'const session = await createWaveCheckout({ amount: 5000 });',
        status: 'published' as const,
      };

      const result = ficheFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejette un titre trop court (< 5 caractères)', () => {
      const invalidData = {
        title: 'Wave',
        problem: 'Problème de test suffisant pour passer le min',
        country: 'Sénégal',
        operator_service: 'Wave',
        language: 'Node.js',
        steps: 'Étape 1',
      };

      const result = ficheFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('au moins 5 caractères');
      }
    });

    it('rejette l’absence de pays ou d’opérateur', () => {
      const invalidData = {
        title: 'Titre de fiche valide',
        problem: 'Description du problème valide et explicite',
        country: '',
        operator_service: '',
        language: 'PHP',
        steps: 'Étape 1',
      };

      const result = ficheFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('auth schemas', () => {
    it('valide un login correct', () => {
      const valid = {
        email: 'dev@palabre.africa',
        password: 'password123',
      };
      expect(loginSchema.safeParse(valid).success).toBe(true);
    });

    it('rejette un email invalide au login', () => {
      const invalid = {
        email: 'non-email',
        password: 'password123',
      };
      expect(loginSchema.safeParse(invalid).success).toBe(false);
    });

    it('valide une inscription avec mots de passe identiques et conditions acceptées', () => {
      const valid = {
        username: 'awa_ndiaye',
        displayName: 'Awa Ndiaye',
        email: 'awa@palabre.africa',
        password: 'SuperPassword2026',
        confirmPassword: 'SuperPassword2026',
        country: 'Sénégal',
        acceptTerms: true,
      };
      expect(registerSchema.safeParse(valid).success).toBe(true);
    });

    it('rejette une inscription avec mots de passe divergents', () => {
      const invalid = {
        username: 'awa_ndiaye',
        displayName: 'Awa Ndiaye',
        email: 'awa@palabre.africa',
        password: 'PasswordOne1',
        confirmPassword: 'PasswordTwo2',
        acceptTerms: true,
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('interaction schemas', () => {
    it('valide une confirmation communautaire', () => {
      const valid = {
        country: "Côte d'Ivoire",
        operator_service: 'Orange Money',
        tested_version: 'v2.1',
        test_context: 'Node.js Express sur VPS Dakar',
        comment: 'Fonctionne parfaitement après correction du header hash',
        is_working: true,
      };
      expect(confirmationSchema.safeParse(valid).success).toBe(true);
    });

    it('valide un signalement de problème avec motif', () => {
      const valid = {
        reason: 'obsolete' as const,
        description: 'L’API Orange Money v1 a été dépréciée le mois dernier par l’opérateur.',
      };
      expect(reportSchema.safeParse(valid).success).toBe(true);
    });

    it('valide une variante contextuelle', () => {
      const valid = {
        title: 'Variante MTN MoMo au Bénin',
        country: 'Bénin',
        operator_service: 'MTN MoMo',
        differences: 'Au Bénin, le format de numéro requiert l’indicatif 229 sans le signe plus.',
        code_snippet: 'const phone = "229" + rawPhone;',
      };
      expect(variantSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('entraide schemas', () => {
    it('valide un problème d’entraide complet', () => {
      const valid = {
        title: 'Erreur 401 Webhook Wave Checkout',
        description: 'La vérification de signature HMAC échoue systématiquement sur mon serveur Express.',
        technology: 'Node.js',
        language: 'TypeScript',
        framework: 'Express',
        error_message: 'Invalid signature header',
        expected_result: 'Le statut de la commande passe à payé',
        tools_version: 'Node 20.10',
        environment: 'Ubuntu 22.04',
        code_snippet: 'const isValid = verifyWaveSignature(body, signature, secret);',
        code_language: 'typescript',
        attachments: [],
        status: 'open' as const,
      };
      const result = questionFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejette une question avec un titre inférieur à 5 caractères', () => {
      const invalid = {
        title: 'Bug',
        description: 'Description suffisamment longue pour passer le test.',
        technology: 'React',
      };
      const result = questionFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejette une question sans technologie', () => {
      const invalid = {
        title: 'Erreur de connexion',
        description: 'Description valide et explicite de mon problème.',
        technology: '',
      };
      const result = questionFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('valide une réponse d’entraide', () => {
      const validAnswer = {
        content: 'Vous devez utiliser express.raw() pour capturer le corps brut sans parsing JSON.',
        code_snippet: 'app.use("/webhook", express.raw({ type: "application/json" }));',
        code_language: 'javascript',
      };
      const result = answerFormSchema.safeParse(validAnswer);
      expect(result.success).toBe(true);
    });

    it('valide un signalement de problème d’entraide', () => {
      const validReport = {
        reason: 'security_risk' as const,
        description: 'L’extrait de code contient une clé API secrète en clair.',
      };
      const result = questionReportSchema.safeParse(validReport);
      expect(result.success).toBe(true);
    });
  });
});

