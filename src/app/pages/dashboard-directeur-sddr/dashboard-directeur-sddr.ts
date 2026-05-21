import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { CultureService } from '../../services/culture';
import { Culture } from '../../models/culture';
import { Parcelle } from '../../models/parcelle';
import { Recolte, RapportAgricole } from '../../models/recolte';

interface Agriculteur {
  id: number;
  nom: string;
  prenom: string;
  parcelles: Parcelle[];
}

@Component({
  selector: 'app-dashboard-directeur-sddr',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-directeur-sddr.html',
  styleUrl: './dashboard-directeur-sddr.css'
})
export class DashboardDirecteurSddr implements OnInit {

  ongletActif = 'accueil';
  message = '';
  messageType = '';
  nomDirecteur = '';
  prenomDirecteur = '';
  nomDepartement = '';
  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  parcelles = signal<Parcelle[]>([]);
  cultures = signal<Culture[]>([]);
  recoltes = signal<Recolte[]>([]);
  agriculteurs = signal<Agriculteur[]>([]);
  rapport = signal<RapportAgricole | null>(null);
  statsVariete = signal<{ [key: string]: number }>({});
  statsType = signal<{ [key: string]: number }>({});
  prevuVsReel = signal<{ totalPrevu: number; totalReel: number; tauxRealisation: string } | null>(null);
  surfaceCultivee = signal<number>(0);
  historiqueSurface = signal<{ annee: number; surfaceCultivee: number }[]>([]);
  chargement = signal(false);
  anneeRapport = new Date().getFullYear();

  totalParcelles = computed(() => this.parcelles().length);
  totalCultures = computed(() => this.cultures().length);
  totalRecoltes = computed(() => this.recoltes().length);

  culturesEnRetard = computed(() =>
    this.cultures().filter((c: Culture) => {
      if (!c.datePremierRecoltePrevu) return false;
      return new Date(c.datePremierRecoltePrevu) < new Date();
    }).length
  );

  searchCulture = signal('');
  searchRecolte = signal('');
  searchAgriculteur = signal('');
  searchParcelle = signal('');

  culturesFiltrees = computed(() => {
    const q = this.searchCulture().toLowerCase();
    if (!q) return this.cultures();
    return this.cultures().filter((c: Culture) =>
      c.type?.toLowerCase().includes(q) ||
      c.variete?.toLowerCase().includes(q) ||
      c.nomParcelle?.toLowerCase().includes(q) ||
      c.saison?.toLowerCase().includes(q)
    );
  });

  recoltesFiltrees = computed(() => {
    const q = this.searchRecolte().toLowerCase();
    if (!q) return this.recoltes();
    return this.recoltes().filter((r: Recolte) =>
      r.typeCulture?.toLowerCase().includes(q) ||
      r.varieteCulture?.toLowerCase().includes(q) ||
      r.nomParcelle?.toLowerCase().includes(q)
    );
  });

  agriculteursFiltres = computed(() => {
    const q = this.searchAgriculteur().toLowerCase();
    if (!q) return this.agriculteurs();
    return this.agriculteurs().filter((a: Agriculteur) =>
      a.nom?.toLowerCase().includes(q) ||
      a.prenom?.toLowerCase().includes(q)
    );
  });

  parcellesFiltrees = computed(() => {
    const q = this.searchParcelle().toLowerCase();
    if (!q) return this.parcelles();
    return this.parcelles().filter((p: Parcelle) =>
      p.nomParcelle?.toLowerCase().includes(q) ||
      p.lieu?.toLowerCase().includes(q) ||
      p.nomAgriculteur?.toLowerCase().includes(q)
    );
  });

  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private authService: Auth,
    private cultureService: CultureService
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerDonnees();
    this.chargerStats();
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  changerOnglet(onglet: string) {
    this.ongletActif = onglet;
    if (onglet === 'rapport' && !this.rapport()) this.chargerRapport();
  }

  chargerProfil() {
    this.http.get<any>(
      `${this.apiUrl}/api/users/directeurs/sddr/mon-profil`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data: any) => {
        this.nomDirecteur = data.nom || '';
        this.prenomDirecteur = data.prenom || '';
        this.nomDepartement = data.nomDepartement || data.nomServiceDepartementale || '';
      },
      error: () => console.error('Erreur profil SDDR')
    });
  }

  chargerDonnees() {
    this.chargement.set(true);
    this.cultureService.getParcellesDepartement().subscribe({
      next: (data: Parcelle[]) => {
        this.parcelles.set(data);
        this.construireAgriculteurs(data);
        this.chargement.set(false);
      },
      error: () => { this.showMessage('Erreur chargement parcelles !', 'error'); this.chargement.set(false); }
    });
    this.cultureService.getCulturesDepartement().subscribe({
      next: (data: Culture[]) => this.cultures.set(data),
      error: () => this.showMessage('Erreur chargement cultures !', 'error')
    });
    this.cultureService.getRecoltesDepartement().subscribe({
      next: (data: Recolte[]) => this.recoltes.set(data),
      error: () => this.showMessage('Erreur chargement récoltes !', 'error')
    });
    this.cultureService.getSurfaceCultivee().subscribe({
      next: (data: { annee: number; surfaceCultivee: number }) =>
        this.surfaceCultivee.set(data.surfaceCultivee || 0),
      error: () => {}
    });
    this.cultureService.getHistoriqueSurface().subscribe({
      next: (data: { annee: number; surfaceCultivee: number }[]) =>
        this.historiqueSurface.set(data),
      error: () => {}
    });
  }

  chargerStats() {
    this.cultureService.getStatsParVariete().subscribe({
      next: (data: { [key: string]: number }) => this.statsVariete.set(data),
      error: () => {}
    });
    this.cultureService.getStatsParType().subscribe({
      next: (data: { [key: string]: number }) => this.statsType.set(data),
      error: () => {}
    });
    this.cultureService.getPrevuVsReel().subscribe({
      next: (data: { totalPrevu: number; totalReel: number; tauxRealisation: string }) =>
        this.prevuVsReel.set(data),
      error: () => {}
    });
  }

  chargerRapport() {
    this.chargement.set(true);
    this.cultureService.getRapport(this.anneeRapport).subscribe({
      next: (data: RapportAgricole) => { this.rapport.set(data); this.chargement.set(false); },
      error: () => { this.showMessage('Erreur chargement rapport !', 'error'); this.chargement.set(false); }
    });
  }

  telechargerPdf() {
    this.cultureService.getRapportPdf(this.anneeRapport).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_${this.nomDepartement}_${this.anneeRapport}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.showMessage('Rapport PDF téléchargé !', 'success');
      },
      error: () => this.showMessage('Erreur téléchargement PDF !', 'error')
    });
  }

  construireAgriculteurs(parcelles: Parcelle[]) {
    const map = new Map<number, Agriculteur>();
    parcelles.forEach((p: Parcelle) => {
      if (!p.idAgriculteur) return;
      if (!map.has(p.idAgriculteur)) {
        map.set(p.idAgriculteur, {
          id: p.idAgriculteur,
          nom: p.nomAgriculteur || '',
          prenom: p.prenomAgriculteur || '',
          parcelles: []
        });
      }
      map.get(p.idAgriculteur)!.parcelles.push(p);
    });
    this.agriculteurs.set(Array.from(map.values()));
  }

  getStatutCulture(culture: Culture): string {
    if (!culture.datePremierRecoltePrevu) return 'EN_COURS';
    const datePrevu = new Date(culture.datePremierRecoltePrevu);
    const aujourdhui = new Date();
    const diff = Math.ceil((datePrevu.getTime() - aujourdhui.getTime()) / (1000 * 3600 * 24));
    if (diff < 0) return 'EN_RETARD';
    if (diff <= 30) return 'PRETE';
    return 'EN_COURS';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'EN_COURS': 'En cours', 'PRETE': 'Prête',
      'EN_RETARD': 'En retard', 'RECOLTEE': 'Récoltée', 'PLANIFIEE': 'Planifiée'
    };
    return labels[statut] || statut;
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'EN_COURS': 'statut-cours', 'PRETE': 'statut-prete',
      'EN_RETARD': 'statut-retard', 'RECOLTEE': 'statut-recoltee', 'PLANIFIEE': 'statut-planifiee'
    };
    return classes[statut] || '';
  }

  getTauxClass(taux: string): string {
    const val = parseInt(taux);
    if (val >= 80) return 'taux-bon';
    if (val >= 50) return 'taux-moyen';
    return 'taux-faible';
  }

  objectKeys(obj: { [key: string]: number } | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getMaxVal(obj: { [key: string]: number }): number {
    const vals = Object.values(obj);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }

  showMessage(msg: string, type: string) {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'accueil': 'Analytics', 'agriculteurs': 'Agriculteurs',
      'parcelles': 'Parcelles', 'cultures': 'Cultures',
      'recoltes': 'Récoltes', 'analyse': 'Analyse rendement',
      'rapport': 'Rapport agricole'
    };
    return titles[this.ongletActif] || 'Dashboard';
  }

  getVarieteColor(index: number): string {
    const colors = ['#1b5e20', '#388e3c', '#f9a825', '#e65100'];
    return colors[index % colors.length];
  }

  getTaux(reel: number, prevu: number): string {
    if (!prevu) return '—';
    return Math.round((reel / prevu) * 100) + '%';
  }

  logout() { this.authService.logout(); }
}
