import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface AgriculteurCoop {
  idUtilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  anneeExperience: number;
  niveauInstruction: string;
  actif: boolean;
  nomCooperative: string;
}

interface RecolteResponse {
  idRecolte: number;
  dateRecolte: string;
  quantiteRecolte: number;
  idCulture: number;
  typeCulture: string;
  varieteCulture: string;
  nomParcelle: string;
  quantiteRecoltePrevu: number;
}

interface CultureAvancement {
  nomRegion: string;
  totalCultures: number;
  enCours: number;
  prete: number;
  enRetard: number;
  recoltee: number;
  planifiee: number;
  avancementMoyenPourcent: number;
}

interface ProductionReponse {
  totalProduitsKg: number;
  totalPrevuKg: number;
  tauxRealisation: string;
  nombreRecoltes: number;
  productionParVariete: {[key: string]: number};
  productionParSaison: {[key: string]: number};
}

interface ProfilChef {
  idUtilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  nomCooperative: string;
  idCooperative: number;
}

interface PrevisionResponse {
  produit: string;
  productionPrevueTonnes: number;
  periodeRecolte: string;
  message: string;
  productionParMois: {[key: string]: number};
}

@Component({
  selector: 'app-dashboard-chef-cooperatif',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-chef-cooperatif.html',
  styleUrl: './dashboard-chef-cooperatif.css'
})
export class DashboardChefCooperatif implements OnInit {

  private apiUrl = 'http://localhost:8080';
  ongletActif = 'dashboard';

  profil = signal<ProfilChef | null>(null);
  agriculteurs = signal<AgriculteurCoop[]>([]);
  recoltes = signal<RecolteResponse[]>([]);
  avancement = signal<CultureAvancement[]>([]);
  production = signal<ProductionReponse | null>(null);
  prevision = signal<PrevisionResponse | null>(null);

  showFormAgriculteur = false;
  showFormModifierAgriculteur = false;
  agriculteurAModifier: any = null;

  nouveauAgriculteur = {
    nom: '', prenom: '', email: '', telephone: '',
    adresse: '', anneeExperience: 0, niveauInstruction: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerAgriculteurs();
    this.chargerProduction();
    this.chargerAvancement();
    this.chargerRecoltes();
    this.chargerPrevision();
  }

  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  chargerProfil() {
    this.http.get<ProfilChef>(
      `${this.apiUrl}/api/users/chefs-cooperatifs/mon-profil`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.profil.set(d), error: () => {} });
  }

  chargerAgriculteurs() {
    this.http.get<AgriculteurCoop[]>(
      `${this.apiUrl}/api/users/chefs-cooperatifs/mes-agriculteurs`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.agriculteurs.set(d), error: () => {} });
  }

  chargerProduction() {
    this.http.get<ProductionReponse>(
      `${this.apiUrl}/api/culture/productions/ma-cooperative/tableau-de-bord`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.production.set(d), error: () => {} });
  }

  chargerAvancement() {
    this.http.get<CultureAvancement[]>(
      `${this.apiUrl}/api/culture/productions/ma-cooperative/suivi-cultures`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.avancement.set(d), error: () => {} });
  }

  chargerRecoltes() {
    this.http.get<RecolteResponse[]>(
      `${this.apiUrl}/api/culture/recoltes/ma-cooperative`,
      { headers: this.getHeaders() }
    ).subscribe({ next: d => this.recoltes.set(d), error: () => {} });
  }

  chargerPrevision() {
      this.http.get<PrevisionResponse>(
          `${this.apiUrl}/api/culture/previsions/ma-cooperative/oignon`,
          { headers: this.getHeaders() }
      ).subscribe({ next: d => this.prevision.set(d), error: () => {} });
  }

  changerOnglet(onglet: string) {
    this.ongletActif = onglet;
    this.showFormAgriculteur = false;
    this.showFormModifierAgriculteur = false;
  }

  // ── AGRICULTEURS ──────────────────────────────────────
  ajouterAgriculteur() {
    this.http.post(
      `${this.apiUrl}/api/users/chefs-cooperatifs/agriculteurs`,
      this.nouveauAgriculteur,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.chargerAgriculteurs();
        this.showFormAgriculteur = false;
        this.resetFormAgriculteur();
      },
      error: () => {}
    });
  }

  ouvrirModifierAgriculteur(a: AgriculteurCoop) {
    this.agriculteurAModifier = { ...a };
    this.showFormModifierAgriculteur = true;
    this.showFormAgriculteur = false;
  }

  modifierAgriculteur() {
    this.http.put(
      `${this.apiUrl}/api/users/agriculteurs/${this.agriculteurAModifier.idUtilisateur}`,
      this.agriculteurAModifier,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.chargerAgriculteurs();
        this.showFormModifierAgriculteur = false;
        this.agriculteurAModifier = null;
      },
      error: () => {}
    });
  }

  supprimerAgriculteur(id: number) {
    if (!confirm('Supprimer cet agriculteur ?')) return;
    this.http.delete(
      `${this.apiUrl}/api/users/agriculteurs/${id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => this.chargerAgriculteurs(),
      error: () => {}
    });
  }

  resetFormAgriculteur() {
    this.nouveauAgriculteur = {
      nom: '', prenom: '', email: '', telephone: '',
      adresse: '', anneeExperience: 0, niveauInstruction: ''
    };
  }

  // ── CALCULS ───────────────────────────────────────────
  getTotalRecolteKg(): number {
    return this.recoltes().reduce((sum, r) => sum + r.quantiteRecolte, 0);
  }

  getTotalCultures(): number {
    return this.avancement().reduce((sum, a) => sum + a.totalCultures, 0);
  }

  getTotalAvancement(statut: string): number {
    return this.avancement().reduce((sum, a) => {
      if (statut === 'recoltee') return sum + a.recoltee;
      if (statut === 'enCours') return sum + a.enCours;
      if (statut === 'enRetard') return sum + a.enRetard;
      //if (statut === 'planifiee') return sum + a.planifiee;
      return sum;
    }, 0);
  }

  getPourcentage(statut: string): number {
    const total = this.getTotalCultures();
    if (total === 0) return 0;
    return Math.round((this.getTotalAvancement(statut) / total) * 100);
  }

  getTauxRealisation(): string {
    return this.production()?.tauxRealisation || '—';
  }

  getInitiales(nom: string, prenom: string): string {
    return (nom?.charAt(0) || '') + (prenom?.charAt(0) || '');
  }
showProfilPopup = false;
showFormProfil = false;
profilAModifier: any = null;

toggleProfilPopup() {
    this.showProfilPopup = !this.showProfilPopup;
    this.showFormProfil = false;
    this.profilAModifier = null;
}

ouvrirModifierProfil() {
    const p = this.profil();
    if (!p) return;
    this.profilAModifier = {
        nom: p.nom,
        prenom: p.prenom,
        telephone: p.telephone,
        email: p.email,
        adresse: '',
        idCooperative: p.idCooperative
    };
    this.showFormProfil = true;
}

modifierProfil() {
    const p = this.profil();
    if (!p || !this.profilAModifier) return;
    this.http.put(
        `${this.apiUrl}/api/users/chefs-cooperatifs/${p.idUtilisateur}`,
        this.profilAModifier,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.chargerProfil();
            this.showFormProfil = false;
            this.showProfilPopup = false;
            this.profilAModifier = null;
        },
        error: () => {}
    });
}
  // ── DÉCONNEXION ───────────────────────────────────────
  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['/login']);
  }
}

