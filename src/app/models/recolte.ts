export interface Recolte {
  idRecolte: number;
  dateRecolte: string;
  quantiteRecolte: number;
  idCulture: number;
  typeCulture: string;
  varieteCulture: string;
  nomParcelle: string;
  quantiteRecoltePrevu: number;
  idDepartement: number;
  nomRegion: string;
}

export interface RapportAgricole {
  annee: number;
  territoire: string;
  typeTerritoire: string;
  nomDirecteur: string;
  prenomDirecteur: string;
  dateGeneration: string;
  superficieTotale: number;
  surfaceCultivee: number;
  tauxOccupation: number;
  totalProduitKg: number;
  totalPrevuKg: number;
  tauxRealisation: string;
  nombreRecoltes: number;
  productionParCulture: { [key: string]: number };
  productionParVariete: { [key: string]: number };
  productionParSaison: { [key: string]: number };
  culturesEnRetard: number;
  recoltesSousSeuil: number;
  historiqueSurface: { annee: number; surfaceCultivee: number }[];
  historiqueProduction: { [key: string]: number };
}
