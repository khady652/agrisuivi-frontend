export interface Culture {
  idCulture: number;
  type: string;
  variete: string;
  dateSemence: string;
  datePremierRecoltePrevu: string;
  typeIrrigation: string;
  quantiteSeme: number;
  superficiCultive: number;
  saison: string;
  quantiteRecoltePrevu: number;
  intraUtilise: string;
  intraSuplementaire: boolean;
  engrais: boolean;
  idParcel: number;
  nomParcelle: string;
  lieu: string;
}
