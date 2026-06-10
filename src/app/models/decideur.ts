export interface ProfilDecideur {
  idUtilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  actif: boolean;
}

export interface RecoltDecideur {
  idRecolte: number;
  dateRecolte: string;
  quantiteRecolte: number;
  typeCulture: string;
  varieteCulture: string;
  nomParcelle: string;
  quantiteRecoltePrevu: number;
  nomRegion: string;
}

export interface StockAlert {
  produit: string;
  stockTotalTonnes: number;
  moisCouverts: number;
  niveau: string;
  message: string;
  stockParMarche: Record<string, number>;
}

export interface CollecteDecideur {
  idCollecte: number;
  dateCollecte: string;
  produit: string;
  prixUnitaire: number;
  quantiteDisponible: number;
  nomMarche: string;
  lieuMarche: string;
  nomEnqueteur: string;
  prenomEnqueteur: string;
}

export interface Prevision {
  produit: string;
  productionPrevueTonnes: number;
  periodeRecolte: string;
  message: string;
  productionParMois: Record<string, number>;
  productionParRegion: Record<string, number>;
}

export interface Notification {
  type: 'success' | 'warning' | 'danger' | 'info';
  icon: string;
  titre: string;
  message: string;
  temps: string;
}
export interface Marche {
  idMarche: number;
  nomMarche: string;
  lieuMarche: string;
  typeMarche: string;
  capaciteStockage: number;
}

export interface Enqueteur {
  idUtilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  organisation: string;
  zoneAffectation: string;
  actif: boolean;
}
