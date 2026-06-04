import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Culture } from '../models/culture';
import { Parcelle } from '../models/parcelle';
import { Recolte, RapportAgricole } from '../models/recolte';

@Injectable({ providedIn: 'root' })
export class CultureService {

  private apiUrl = 'http://localhost:8080/api/culture';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getParcellesDepartement(): Observable<Parcelle[]> {
    return this.http.get<Parcelle[]>(
      `${this.apiUrl}/parcelles/mon-departement`,
      { headers: this.headers() }
    );
  }

  getCulturesDepartement(): Observable<Culture[]> {
    return this.http.get<Culture[]>(
      `${this.apiUrl}/cultures/mon-departement`,
      { headers: this.headers() }
    );
  }

  getRecoltesDepartement(): Observable<Recolte[]> {
    return this.http.get<Recolte[]>(
      `${this.apiUrl}/recoltes/mon-departement`,
      { headers: this.headers() }
    );
  }

  getStatsParVariete(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(
      `${this.apiUrl}/recoltes/stats/par-variete`,
      { headers: this.headers() }
    );
  }

  getStatsParType(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(
      `${this.apiUrl}/recoltes/stats/par-type`,
      { headers: this.headers() }
    );
  }

  getPrevuVsReel(): Observable<{ totalPrevu: number; totalReel: number; tauxRealisation: string }> {
    return this.http.get<{ totalPrevu: number; totalReel: number; tauxRealisation: string }>(
      `${this.apiUrl}/recoltes/stats/prevu-vs-reel`,
      { headers: this.headers() }
    );
  }

  getSurfaceCultivee(): Observable<{ annee: number; surfaceCultivee: number }> {
    return this.http.get<{ annee: number; surfaceCultivee: number }>(
      `${this.apiUrl}/productions/mon-departement/surface-cultivee`,
      { headers: this.headers() }
    );
  }

  getHistoriqueSurface(): Observable<{ annee: number; surfaceCultivee: number }[]> {
    return this.http.get<{ annee: number; surfaceCultivee: number }[]>(
      `${this.apiUrl}/productions/mon-departement/historique`,
      { headers: this.headers() }
    );
  }

  getRapport(annee?: number): Observable<RapportAgricole> {
    const params = annee ? `?annee=${annee}` : '';
    return this.http.get<RapportAgricole>(
      `${this.apiUrl}/rapports/mon-departement${params}`,
      { headers: this.headers() }
    );
  }

  getRapportPdf(annee?: number): Observable<Blob> {
    const params = annee ? `?annee=${annee}` : '';
    return this.http.get(
      `${this.apiUrl}/rapports/mon-departement/pdf${params}`,
      { headers: this.headers(), responseType: 'blob' }
    );
  }
getProductionMensuelle(): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrl}/productions/mon-departement/mensuel`,
    { headers: this.headers() }
  );
}
}
