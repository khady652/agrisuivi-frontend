import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class Public {

    private apiUrl = 'http://localhost:8080';

    constructor(private http: HttpClient) {}

    getPrixMarches(): Observable<any[]> {
        return this.http.get<any[]>(
            `${this.apiUrl}/api/public/marches/prix`);
    }

    getStockDuJour(): Observable<any> {
        return this.http.get<any>(
            `${this.apiUrl}/api/public/marches/stock`);
    }

    getZonesProduction(): Observable<any> {
        return this.http.get<any>(
            `${this.apiUrl}/api/public/carte/zones-production`);
    }
}
