import React from 'react';
import { Search, PenLine, CheckCircle2, ShieldCheck, AlertTriangle, KeyRound, HelpCircle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const HelpPage: React.FC = () => {
  const guideItems = [
    {
      title: 'Chercher efficacement',
      icon: <Search className="text-palabre-primary" size={20} />,
      content:
        'Combinez les filtres par pays (Sénégal, Côte d’Ivoire, Cameroun...), opérateur ou service (Wave, Orange Money, MoMo, SMS, USSD), et technologie pour trouver la solution adaptée à votre stack réelle.',
    },
    {
      title: 'Rédiger une bonne fiche',
      icon: <PenLine className="text-palabre-primary" size={20} />,
      content:
        'Décrivez le problème avec précision, listez des étapes concrètes de résolution reproductibles, et fournissez un extrait de code clair sans variables implicites inconnues.',
    },
    {
      title: 'Confirmer une solution',
      icon: <CheckCircle2 className="text-palabre-ok" size={20} />,
      content:
        'Si une solution a fonctionné pour vous, cliquez sur "Ça marche chez moi" en précisant votre pays, la version testée et un bref commentaire. Cela renforce la confiance de la communauté.',
    },
    {
      title: 'Comprendre les statuts',
      icon: <ShieldCheck className="text-palabre-primary" size={20} />,
      content:
        'Une fiche confirmée récemment est marquée "Confirmée". Si aucun test n’a eu lieu depuis 90 jours, elle passe "À revérifier". Si des blocages sont remontés, elle devient "Signalée".',
    },
    {
      title: 'Signaler un problème',
      icon: <AlertTriangle className="text-palabre-fl" size={20} />,
      content:
        'Si une fiche contient une erreur technique, une incompatibilité avec une nouvelle version d’API ou une faille de sécurité, signalez-la immédiatement avec des explications concrètes.',
    },
    {
      title: 'Sécurité absolue : Pas de secrets',
      icon: <KeyRound className="text-amber-600" size={20} />,
      content:
        'Ne collez jamais de clés privées, jetons d’API, mots de passe de production ou numéros de téléphone réels dans les extraits de code. Utilisez systématiquement des variables d’environnement fictives.',
    },
  ];

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1 text-palabre-primary">
          <HelpCircle size={22} />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-palabre-text tracking-tight">
            Aide & Guide de contribution
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-palabre-muted">
          Palabre repose sur la collaboration et la rigueur technique des développeurs africains.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guideItems.map((item, idx) => (
          <div key={idx} className="bg-white border border-palabre-border rounded-card p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-palabre-bg rounded-btn">{item.icon}</div>
              <h2 className="font-bold text-sm sm:text-base text-palabre-text">{item.title}</h2>
            </div>
            <p className="text-xs sm:text-sm text-palabre-muted leading-relaxed pl-1">
              {item.content}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-palabre-border rounded-card p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-palabre-text">Les 4 statuts de vérification en détail</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-palabre-bg rounded-btn space-y-1">
            <Badge status="ok" />
            <p className="text-xs text-palabre-muted leading-relaxed">
              La solution a été confirmée récemment par au moins 3 développeurs différents dans son contexte annoncé.
            </p>
          </div>

          <div className="p-3 bg-palabre-bg rounded-btn space-y-1">
            <Badge status="re" />
            <p className="text-xs text-palabre-muted leading-relaxed">
              La dernière vérification remonte à plus de 90 jours ou l'API concernée a pu évoluer. À tester par la communauté.
            </p>
          </div>

          <div className="p-3 bg-palabre-bg rounded-btn space-y-1">
            <Badge status="fl" />
            <p className="text-xs text-palabre-muted leading-relaxed">
              Un ou plusieurs développeurs ont signalé un échec ou un comportement divergent. Attention particulière requise.
            </p>
          </div>

          <div className="p-3 bg-palabre-bg rounded-btn space-y-1">
            <Badge status="new" />
            <p className="text-xs text-palabre-muted leading-relaxed">
              Fiche technique récemment publiée ayant encore peu ou pas de retours d'expérience enregistrés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

