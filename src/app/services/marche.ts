import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Marche } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MarcheService {

  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  getAll(headers: HttpHeaders): Observable<Marche[]> {
    return this.http.get<Marche[]>(
      `${this.apiUrl}/api/marche/marches`,
      { headers }
    );
  }
}
