<div dir="rtl">

# تَسْمِيع

**شيخ يسمع حفظك للقرآن بصوتك**: يسكت ما دمتَ مصيباً، ويقول «أعِد» عند الخطأ، ويفتح عليك إذا نسيت. برواية ورش افتراضياً، وبسبع روايات أخرى من مصاحف مجمع الملك فهد.

1. افتح التطبيق في Chrome أو Edge أو Safari على الهاتف أو الحاسوب.
2. اختر الرواية والسورة (أو الجزء، أو «من أي موضع»).
3. اضغط الدائرة واسمح بالميكروفون، ثم اقرأ من حفظك.
4. قل «افتح» إذا نسيت، و«اختبرني» للأسئلة، و«أسمعني» للتلاوة المسجلة، و«الله أكبر» للصلاة.

</div>

---

Application web (PWA, React + Vite + TypeScript) inspirée de [al-Musammiʿ](https://musammi.benjelloun.dev/) :
un « cheikh » qui écoute la récitation de mémoire du Coran, se tait tant qu'elle est juste, dit
« أعِد » (« recommence ») à la moindre erreur et souffle la suite (*fath*) quand on bloque.

Le code est écrit de zéro et fonctionne **sans serveur**, avec deux moteurs :

- **الشيخ الحي (cheikh en direct)**, avec une clé Gemini gratuite gardée dans le navigateur : le
  téléphone parle directement à **Gemini Live** (`gemini-3.8-live`). Le cheikh vous entend, vous
  répond en arabe de sa voix, fait passer l'examen, explique le sens des versets. Il juge la
  récitation sur le **texte imprimé** que l'application lui donne (outils `open_mushaf`, `get_fath`,
  `exam_question`…), jamais de mémoire. Dans la conversation, tout passage du Coran (récité ou cité)
  est affiché tel qu'imprimé dans le mushaf de la riwaya, avec ses numéros de versets.
- **Sans clé** : reconnaissance vocale du navigateur (API Web Speech, `ar-SA`) et jugement mot à mot
  sur le téléphone, contre le texte imprimé de la riwaya choisie.

## Fonctionnalités

| | |
|---|---|
| **Écoute silencieuse** | Aucune réponse quand la récitation est juste. Un mot faux ou des mots sautés : « أعِد » à voix basse (ou un son doux) et une vibration. Le mot fautif est souligné. |
| **Fath** | Après 5 s de silence (réglable ; 3,5 s en prière) ou si l'on dit « افتح », l'application donne les mots suivants jusqu'au prochain signe de pause, tirés du mushaf. |
| **Huit riwayat** | Warsh (par défaut), Qalun, Hafs, Shuʿba, al-Duri, al-Susi, al-Bazzi et Qunbul (textes du Complexe du roi Fahd). Comme la reconnaissance vocale entend « en Hafs », la forme de Hafs est aussi acceptée là où la riwaya diffère (مَلِكِ / مالك…). |
| **Texte caché ou visible** | En mode mémorisation, les mots n'apparaissent qu'une fois récités ; en mode révision, le verset est visible en grisé. |
| **N'importe où** | Mode « من أي موضع » : l'application retrouve seule l'endroit récité dans tout le mushaf, en attendant que les passages semblables (*mutashābihāt*) soient départagés. |
| **Prière** | « الله أكبر » ou le bouton الصلاة : écran noir qui reste allumé, localisation automatique (Fatiha puis sourate), « أعِد » sur une erreur, fath après 3,5 s. « السلام عليكم » termine. |
| **Examens** | « اختبرني » : compléter un verset, réciter le verset suivant ou précédent, le début d'une sourate, « dans quelle sourate est ce verset ? » (réponse à la voix ou au toucher). |
| **Récitations enregistrées** | « أسمعني » joue la suite depuis l'endroit courant (everyayah.com : al-Husary, al-Minshawi, al-Afasy… en Hafs ; Ibrahim al-Dosary, Yassin al-Jazaery, Abdul Basit en Warsh). « حسبك » arrête. |
| **Sens des versets** | « ما معنى الآية؟ » ou le bouton المعنى : al-Tafsir al-Muyassar ou al-Jalalayn. |
| **Mémoire** | Chaque séance (mots récités, erreurs, fath) est gardée sur le téléphone ; l'historique liste les versets où l'on bute le plus, avec un bouton pour les réviser. |
| **Commandes vocales** | « سأقرأ سورة الملك », « افتح », « اختبرني », « أسمعني », « حسبك », « ما معنى الآية »… |

## Comment ça marche

### Cheikh en direct (Gemini Live)

```
micro 16 kHz ──► PauseSegmenter (tours coupés aux pauses du récitant) ──► activityStart / audio / activityEnd
                                                                              │ WebSocket (SDK @google/genai)
haut-parleur 24 kHz ◄── voix du cheikh ◄──────────────────────────── Gemini Live (gemini-3.8-live)
                                                                              │ appels d'outils
        application : open_mushaf · get_fath · exam_question · exam_answer · tafsir ·
                      play_recitation · stop_recitation · set_riwaya · prayer · end_session
```

- `src/live/segmenter.ts` — la détection automatique de Gemini coupe mal une récitation psalmodiée :
  l'application découpe elle-même les tours (plancher de bruit adaptatif ; fin après 0,45 s de pause
  en récitation, 1,1 s en conversation ; coupure à la première respiration après 3,5 s).
- `src/live/session.ts` — micro (AudioWorklet, annulation d'écho) → Gemini → lecture sans trou ;
  `NO_INTERRUPTION` pour que « أعِد » soit dit par-dessus la récitation ; le récitant peut couper une
  longue explication ; reprise de session (`sessionResumption`, `goAway`) et compression du contexte ;
  arrêt après 3 min de silence (20 min en prière).
- `src/live/prompt.ts` — les consignes du cheikh et la déclaration des outils.
- `src/quran/quranize.ts` — repère les passages du Coran dans la conversation (index de trigrammes)
  pour les afficher avec le texte imprimé.
- Le fath reste fait par l'application : après un silence, elle envoie au cheikh les mots exacts
  jusqu'au prochain waqf, qu'il souffle à voix basse.

### Sans clé

```
micro ──► SpeechRecognition (ar-SA, continue) ──► segment final (après une pause)
                                                    │
                     commande ? ◄───────────────────┤
                                                    ▼
                              Tracker : alignement mot à mot sur le mushaf
                              ├─ mot juste            → avance, silence
                              ├─ mot avalé par la RV  → avance (toléré)
                              ├─ répétition           → retour en arrière, silence
                              ├─ isti'âdha, basmala…  → ignorés
                              ├─ mots / verset sautés → « أعِد »
                              └─ mot faux             → « أعِد »
      minuteur de silence ──► fath : mots jusqu'au prochain signe de waqf
```

- **`src/quran/arabic.ts`** — normalisation : sans voyelles ni signes coraniques, formes de l'alif
  et de la hamza unifiées, alif suscrit lu ou non, « squelette » sans lettres de prolongation pour
  absorber les écarts entre rasm uthmani et orthographe courante (ٱلۡعَٰلَمِينَ / العالمين,
  ٱلصَّلَوٰةَ / الصلاة). Trois niveaux d'exigence (متساهل / وسط / دقيق) ; le niveau moyen
  refuse toute différence sur la première lettre (يعملون ≠ تعملون).
- **`src/quran/mushaf.ts`** — découpage des versets en mots (signes ۞ ۩ et waqf rattachés), variante
  Hafs mot à mot pour les autres riwayat, index de trigrammes pour localiser une récitation dans les
  6 236 versets, mise en cache hors ligne.
- **`src/quran/tracker.ts`** — le suivi décrit plus haut.
- **`src/speech/`** — reconnaissance continue avec relance automatique, voix « أعِد » et fath
  (synthèse vocale arabe, ou sons si aucune voix arabe n'est installée), commandes vocales.
- **`src/exam/exam.ts`** — génération des questions.
- **`src/App.tsx`** — l'écran unique, les séances, la prière, l'examen.

### Données

| | Source |
|---|---|
| Textes des 8 riwayat, tafsir | [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api) via jsDelivr (textes du Complexe du roi Fahd) |
| Métadonnées (sourates, ajzāʾ) | [api.alquran.cloud](https://alquran.cloud/api), figées dans `src/data/surahs.ts` (`npm run gen:surahs`) |
| Récitations | [everyayah.com](https://everyayah.com) |
| Polices | Amiri Quran, Scheherazade New (Google Fonts) |

Toutes les riwayat sont numérotées comme Hafs (6 236 versets) dans ces données, ce qui permet
d'aligner chaque verset sur sa variante Hafs.

### Limites connues

- La reconnaissance vocale du navigateur est faite pour la parole courante : elle entend la récitation
  « en Hafs » et ne juge pas les *uṣūl* (imala, tas-hil, taqlil, madd, ghunna). Le suivi juge les **mots**.
- Le mode en direct a été testé de bout en bout contre un serveur Gemini Live simulé (protocole,
  outils, tours de parole) ; la qualité du jugement dépend du modèle de Google.
- En mode sans clé, Firefox n'a pas l'API Web Speech : un **mode écrit** (réglages) permet alors de taper ce que l'on récite.
- Sur Chrome, l'audio est envoyé aux serveurs de Google pour la transcription ; l'application, elle,
  n'enregistre rien et ne garde que l'historique local.
- Les récitations enregistrées n'existent qu'en Hafs et en Warsh ; pour les autres riwayat, « أسمعني »
  joue un récitateur en Hafs (c'est indiqué).

## Développement

Node.js ≥ 20.19.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests du suivi (Vitest) sur de vrais extraits du mushaf
npm run build      # dans dist/
```

La reconnaissance vocale exige HTTPS (ou `localhost`). Le dossier `dist/` est statique : il se
déploie tel quel (GitHub Pages, Netlify, Cloudflare Pages…). Le workflow
`.github/workflows/deploy.yml` publie sur GitHub Pages à chaque push sur `main`
(Settings → Pages → Source : *GitHub Actions*).

## Crédits

Concept : [al-Musammiʿ](https://github.com/kmbenjel/musammi) de K. M. Benjelloun. Textes et polices
coraniques : Complexe du roi Fahd ; récitations : everyayah.com et leurs récitateurs ; tafsir :
al-Muyassar (Complexe du roi Fahd) et al-Jalalayn.
