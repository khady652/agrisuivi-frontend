export interface Parcelle {
  idParcel: number;
  nomParcelle: string;
  lieu: string;
  superficie: number;
  typeSol: string;
  qualiteSol: string;
  sourceEau: string;
  estIrriguee: boolean;
  idAgriculteur: number;
  idDepartement: number;
  nomAgriculteur: string;
  prenomAgriculteur: string;
  nomDepartement: string;
}
