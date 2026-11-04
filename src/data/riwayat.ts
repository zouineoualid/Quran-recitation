export interface Reciter {
  id: string;
  name: string;
  /** Dossier sur everyayah.com (un fichier mp3 par verset, numérotation Hafs). */
  folder: string;
}

export interface Riwaya {
  id: string;
  /** Nom complet, ex. « ورش عن نافع ». */
  name: string;
  /** Nom court affiché sur le badge. */
  short: string;
  /** Édition du texte sur fawazahmed0/quran-api (textes du Complexe du roi Fahd). */
  edition: string;
  /** Récitateurs enregistrés dans cette riwaya (vide : on propose ceux de Hafs). */
  reciters: Reciter[];
}

const HAFS_RECITERS: Reciter[] = [
  { id: 'husary', name: 'محمود خليل الحصري', folder: 'Husary_128kbps' },
  { id: 'minshawy', name: 'محمد صديق المنشاوي', folder: 'Minshawy_Murattal_128kbps' },
  { id: 'alafasy', name: 'مشاري العفاسي', folder: 'Alafasy_128kbps' },
  { id: 'shuraym', name: 'سعود الشريم', folder: 'Saood_ash-Shuraym_128kbps' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', folder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'husary-muallim', name: 'الحصري (المصحف المعلم)', folder: 'Husary_Muallim_128kbps' },
];

const WARSH_RECITERS: Reciter[] = [
  { id: 'warsh-dosary', name: 'إبراهيم الدوسري', folder: 'warsh/warsh_ibrahim_aldosary_128kbps' },
  { id: 'warsh-jazaery', name: 'ياسين الجزائري', folder: 'warsh/warsh_yassin_al_jazaery_64kbps' },
  { id: 'warsh-abdulbasit', name: 'عبد الباسط عبد الصمد', folder: 'warsh/warsh_Abdul_Basit_128kbps' },
];

export const RIWAYAT: Riwaya[] = [
  { id: 'warsh', name: 'ورش عن نافع', short: 'ورش', edition: 'ara-quranwarsh', reciters: WARSH_RECITERS },
  { id: 'qalun', name: 'قالون عن نافع', short: 'قالون', edition: 'ara-quranqaloon', reciters: [] },
  { id: 'hafs', name: 'حفص عن عاصم', short: 'حفص', edition: 'ara-quranuthmanihaf', reciters: HAFS_RECITERS },
  { id: 'shuba', name: 'شعبة عن عاصم', short: 'شعبة', edition: 'ara-quranshouba', reciters: [] },
  { id: 'duri', name: 'الدوري عن أبي عمرو', short: 'الدوري', edition: 'ara-qurandoori', reciters: [] },
  { id: 'susi', name: 'السوسي عن أبي عمرو', short: 'السوسي', edition: 'ara-quransoosi', reciters: [] },
  { id: 'bazzi', name: 'البزي عن ابن كثير', short: 'البزي', edition: 'ara-quranbazzi', reciters: [] },
  { id: 'qunbul', name: 'قنبل عن ابن كثير', short: 'قنبل', edition: 'ara-quranqumbul', reciters: [] },
];

export const HAFS = RIWAYAT.find((r) => r.id === 'hafs')!;

export function riwayaById(id: string): Riwaya {
  return RIWAYAT.find((r) => r.id === id) ?? RIWAYAT[0];
}

/** Récitateurs proposés pour une riwaya, et s'ils récitent bien dans cette riwaya. */
export function recitersFor(r: Riwaya): { reciters: Reciter[]; sameRiwaya: boolean } {
  return r.reciters.length ? { reciters: r.reciters, sameRiwaya: true } : { reciters: HAFS_RECITERS, sameRiwaya: false };
}

export interface Tafsir {
  id: string;
  name: string;
  edition: string;
}

export const TAFASIR: Tafsir[] = [
  { id: 'muyassar', name: 'التفسير الميسر', edition: 'ara-kingfahadquranc' },
  { id: 'jalalayn', name: 'تفسير الجلالين', edition: 'ara-jalaladdinalmah' },
];
