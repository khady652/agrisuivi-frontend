import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Enqueteur, CollecteDonnees, Marche } from '../../models';

@Component({
  selector: 'app-dashboard-enqueteur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-enqueteur.html',
  styleUrl: './dashboard-enqueteur.css'
})
export class DashboardEnqueteur implements OnInit {

  private apiUrl = 'http://localhost:8080';
  ongletActif = 'dashboard';

  profil = signal<Enqueteur | null>(null);
  collectes = signal<CollecteDonnees[]>([]);
  marches = signal<Marche[]>([]);

  // Formulaire nouvelle collecte
  showFormCollecte = false;
  showFormModifierCollecte = false;
  collecteAModifier: any = null;

  nouvelleCollecte = {
    dateCollecte: new Date().toISOString().split('T')[0],
    produit: 'oignon',
    prixUnitaire: 0,
    quantiteDisponible: 0,
    idMarche: 0
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerCollectes();
    this.chargerMarches();
  }

  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  chargerProfil() {
    this.http.get<Enqueteur>(
      `${this.apiUrl}/api/users/enqueteurs/mon-profil`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.profil.set(d), error: () => {} });
  }

  chargerCollectes() {
    this.http.get<CollecteDonnees[]>(
      `${this.apiUrl}/api/marche/collectes/mes-collectes`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.collectes.set(d), error: () => {} });
  }

  chargerMarches() {
    this.http.get<Marche[]>(
      `${this.apiUrl}/api/marche/marches`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.marches.set(d), error: () => {} });
  }

  changerOnglet(onglet: string) {
    this.ongletActif = onglet;
    this.showFormCollecte = false;
    this.showFormModifierCollecte = false;
  }

  // ── COLLECTES ─────────────────────────────────────────

ajouterCollecte() {
  console.log('Données envoyées:', this.nouvelleCollecte);
    this.http.post(
        `${this.apiUrl}/api/marche/collectes`,
        this.nouvelleCollecte,
        { headers: this.getHeaders() }
    ).subscribe({
        next: (res) => {
            console.log('Collecte ajoutée:', res);
            this.chargerCollectes();
            this.showFormCollecte = false;
            this.resetFormCollecte();
        },
        error: (err) => {
            console.error('Erreur:', err);
        }
    });
}
  ouvrirModifierCollecte(c: CollecteDonnees) {
    this.collecteAModifier = {
      idCollecte: c.idCollecte,
      dateCollecte: c.dateCollecte,
      produit: c.produit,
      prixUnitaire: c.prixUnitaire,
      quantiteDisponible: c.quantiteDisponible,
      idMarche: c.idMarche
    };
    this.showFormModifierCollecte = true;
    this.showFormCollecte = false;
  }

  modifierCollecte() {
    this.http.put(
      `${this.apiUrl}/api/marche/collectes/${this.collecteAModifier.idCollecte}`,
      this.collecteAModifier,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.chargerCollectes();
        this.showFormModifierCollecte = false;
        this.collecteAModifier = null;
      },
      error: () => {}
    });
  }

  resetFormCollecte() {
    this.nouvelleCollecte = {
      dateCollecte: new Date().toISOString().split('T')[0],
      produit: 'oignon',
      prixUnitaire: 0,
      quantiteDisponible: 0,
      idMarche: 0
    };
  }

  // ── CALCULS ───────────────────────────────────────────
  getNbCollectesMois(): number {
    const now = new Date();
    return this.collectes().filter(c => {
      const d = new Date(c.dateCollecte);
      return d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();
    }).length;
  }

  getPrixMoyen(): number {
    const c = this.collectes();
    if (!c.length) return 0;
    return Math.round(c.reduce((s, x) => s + x.prixUnitaire, 0) / c.length);
  }

  getStockTotal(): number {
    return this.collectes().reduce((s, c) => s + c.quantiteDisponible, 0);
  }

  getDerniereCollecteParMarche(): CollecteDonnees[] {
    const map = new Map<number, CollecteDonnees>();
    this.collectes()
      .sort((a, b) => new Date(b.dateCollecte).getTime() - new Date(a.dateCollecte).getTime())
      .forEach(c => {
        if (!map.has(c.idMarche)) map.set(c.idMarche, c);
      });
    return Array.from(map.values());
  }

  getPrixTendance(idMarche: number): number {
    const collectesMarche = this.collectes()
      .filter(c => c.idMarche === idMarche)
      .sort((a, b) => new Date(a.dateCollecte).getTime() - new Date(b.dateCollecte).getTime());
    if (collectesMarche.length < 2) return 0;
    return collectesMarche[collectesMarche.length - 1].prixUnitaire -
           collectesMarche[collectesMarche.length - 2].prixUnitaire;
  }

  getMaxStock(): number {
    const stocks = this.getDerniereCollecteParMarche().map(c => c.quantiteDisponible);
    return stocks.length ? Math.max(...stocks) : 1;
  }

  getInitiales(nom: string, prenom: string): string {
    return (nom?.charAt(0) || '') + (prenom?.charAt(0) || '');
  }

  formatNumber(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  // ── DÉCONNEXION ───────────────────────────────────────
  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['/login']);
  }
}
