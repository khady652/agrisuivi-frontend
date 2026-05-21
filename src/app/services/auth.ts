import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class Auth {

    private apiUrl = 'http://localhost:8080';

    constructor(
        private http: HttpClient,
        private router: Router
    ) {}

    // ── LOGIN ─────────────────────────────────────────────
    login(email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/auth/login`, {
            email, password
        }).pipe(
            tap((response: any) => {
                localStorage.setItem('token', response.accessToken);
                localStorage.setItem('role', response.role);
                localStorage.setItem('userId', response.userId);
            })
        );
    }

    // ── LOGOUT ────────────────────────────────────────────
    logout(): void {
        localStorage.clear();
        this.router.navigate(['/login']);
    }

    // ── IS LOGGED IN ──────────────────────────────────────
    isLoggedIn(): boolean {
        return !!localStorage.getItem('token');
    }

    // ── GET ROLE ──────────────────────────────────────────
    getRole(): string {
        return localStorage.getItem('role') || '';
    }

    // ── GET USER ID ───────────────────────────────────────
    getUserId(): string {
        return localStorage.getItem('userId') || '';
    }

    // ── GET TOKEN ─────────────────────────────────────────
    getToken(): string {
        return localStorage.getItem('token') || '';
    }

    // ── GET DASHBOARD ROUTE ───────────────────────────────
    getDashboardRoute(): string {
        const role = this.getRole();
        switch (role) {
            case 'DECIDEUR_ARM':      return '/dashboard-decideur';
            case 'DIRECTEUR_SDDR':   return '/dashboard-directeur-sddr';
            case 'DIRECTEUR_DR':     return '/dashboard-directeur-dr';
            case 'CHEF_COOPERATIF':  return '/dashboard-chef-cooperatif';
            case 'ADMINISTRATEUR':   return '/dashboard-admin';
            case 'ENQUETEUR_MARCHE': return '/dashboard-enqueteur';
            case 'AGRICULTEUR':      return '/dashboard-agriculteur';
            default:                 return '/login';
        }
    }
}
