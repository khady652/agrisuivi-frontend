import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { NgApexchartsModule } from 'ng-apexcharts';

interface Culture {
  idCulture: number;
  type: string;
  variete: string;
  saison: string;
  dateSemence: string;
  datePremierRecoltePrevu: string;
  quantiteRecoltePrevu: number;
  nomParcelle: string;
  idParcel: number;
  superficiCultive: number;
  idCulture_parcelle?: number;
}

interface Parcelle {
  idParcel: number;
  nomParcelle: string;
  lieu: string;
  superficie: number;
  typeSol: string;
  qualiteSol: string;
  sourceEau: string;
  estIrriguee: boolean;
  idAgriculteur: number;
  nomAgriculteur: string;
  prenomAgriculteur: string;
}

interface Recolte {
  idRecolte: number;
  dateRecolte: string;
  quantiteRecolte: number;
  quantiteRecoltePrevu: number;
  typeCulture: string;
  varieteCulture: string;
  nomParcelle: string;
  idCulture: number;
}

interface Agriculteur {
  id: number;
  nom: string;
  prenom: string;
  parcelles: Parcelle[];
}

interface HistoriquePoint {
  annee: number;
  surfaceCultivee: number;
}

@Component({
  selector: 'app-dashboard-directeur-dr',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard-directeur-dr.html',
  styleUrl: './dashboard-directeur-dr.css'
})
export class DashboardDirecteurDr implements OnInit {

  ongletActif = 'accueil';
  message = '';
  messageType = '';
  nomDirecteur = '';
  prenomDirecteur = '';
  nomRegion = '';
  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  parcelles = signal<Parcelle[]>([]);
  cultures = signal<Culture[]>([]);
  recoltes = signal<Recolte[]>([]);
  toutesRecoltes = signal<Recolte[]>([]);
  agriculteurs = signal<Agriculteur[]>([]);
  surfaceCultivee = signal<number>(0);
  historiqueSurface = signal<HistoriquePoint[]>([]);
  statsVariete = signal<{ [key: string]: number }>({});
  prevuVsReel = signal<{ totalPrevu: number; totalReel: number; tauxRealisation: string } | null>(null);
  statsVillages = signal<{ lieu: string; production: number; cultures: number }[]>([]);
  anneesDisponibles = signal<number[]>([]);
  anneeCampagne = new Date().getFullYear();
  anneeRapport = new Date().getFullYear();

  searchCulture = signal('');
  searchRecolte = signal('');
  searchAgriculteur = signal('');
  searchParcelle = signal('');

  chartVarietes: any = {
    series: [],
    chart: { type: 'bar', height: 250, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 3 } },
    dataLabels: { enabled: false },
    colors: ['#7b1fa2', '#c62828', '#1b5e20', '#f9a825', '#00695c'],
    xaxis: { categories: [] },
    yaxis: { title: { text: 'Production (t)' } },
    tooltip: { y: { formatter: (val: number) => val.toFixed(2) + ' t' } },
    legend: { position: 'top' },
    grid: { borderColor: '#f0f7f0' }
  };

  chartOptions: any = {
    series: [
      { name: 'Surface cultivée (m²)', data: [] },
      { name: 'Production (kg)', data: [] }
    ],
    chart: { type: 'area', height: 280, toolbar: { show: false } },
    dataLabels: { enabled: false },
    colors: ['#1b5e20', '#f9a825'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: [] },
    yaxis: [
      { title: { text: 'Surface (m²)' } },
      { opposite: true, title: { text: 'Production (kg)' } }
    ],
    tooltip: { shared: true, intersect: false },
    legend: { position: 'top' },
    grid: { borderColor: '#f0f7f0' }
  };

  miniChartCultures: any = {
    series: [{ name: 'Cultures', data: [] }],
    chart: { type: 'bar', height: 80, sparkline: { enabled: true } },
    colors: ['#1b5e20'],
    tooltip: { fixed: { enabled: false } }
  };

  miniChartRecoltes: any = {
    series: [{ name: 'Récoltes', data: [] }],
    chart: { type: 'area', height: 80, sparkline: { enabled: true } },
    colors: ['#00695c'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.3 },
    tooltip: { fixed: { enabled: false } }
  };

  totalParcelles = computed(() => this.parcelles().length);
  totalCultures = computed(() => this.cultures().length);
  totalRecoltes = computed(() => this.recoltes().length);

  culturesEnRetard = computed(() =>
    this.cultures().filter(c => {
      if (!c.datePremierRecoltePrevu) return false;
      return new Date(c.datePremierRecoltePrevu) < new Date();
    }).length
  );

  culturesFiltrees = computed(() => {
    const q = this.searchCulture().toLowerCase();
    if (!q) return this.cultures();
    return this.cultures().filter(c =>
      c.type?.toLowerCase().includes(q) || c.variete?.toLowerCase().includes(q) ||
      c.nomParcelle?.toLowerCase().includes(q)
    );
  });

  recoltesFiltrees = computed(() => {
    const q = this.searchRecolte().toLowerCase();
    if (!q) return this.recoltes();
    return this.recoltes().filter(r =>
      r.typeCulture?.toLowerCase().includes(q) || r.varieteCulture?.toLowerCase().includes(q) ||
      r.nomParcelle?.toLowerCase().includes(q)
    );
  });

  agriculteursFiltres = computed(() => {
    const q = this.searchAgriculteur().toLowerCase();
    if (!q) return this.agriculteurs();
    return this.agriculteurs().filter(a =>
      a.nom?.toLowerCase().includes(q) || a.prenom?.toLowerCase().includes(q)
    );
  });

  parcellesFiltrees = computed(() => {
    const q = this.searchParcelle().toLowerCase();
    if (!q) return this.parcelles();
    return this.parcelles().filter(p =>
      p.nomParcelle?.toLowerCase().includes(q) || p.lieu?.toLowerCase().includes(q) ||
      p.nomAgriculteur?.toLowerCase().includes(q)
    );
  });

  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private authService: Auth
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerDonnees();
    setTimeout(() => {
            const reel = this.getTotalRecolte();
            const prevu = this.getTotalPrevu();
            console.log('=== DEBUG ===');
            console.log('Réel:', reel);
            console.log('Prévu:', prevu);
            console.log('Récoltes:', this.recoltes().length);
        }, 3000);
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  changerOnglet(onglet: string) {
    this.ongletActif = onglet;
  }

  chargerProfil() {
    this.http.get<any>(
      `${this.apiUrl}/api/users/directeurs/drdr/mon-profil`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data: any) => {
        this.nomDirecteur = data.nom || '';
        this.prenomDirecteur = data.prenom || '';
        this.nomRegion = data.nomServiceRegionale || data.nomRegion || '';
        this.nomRegion = data.nomService ||
                         data.nomServiceRegionale ||
                         data.nomRegion || '';
      },
      error: () => {}
    });
  }

  chargerDonnees() {
    // Parcelles
    this.http.get<Parcelle[]>(
      `${this.apiUrl}/api/culture/parcelles/ma-region`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: data => {
        this.parcelles.set(data);
        this.construireAgriculteurs(data);
        setTimeout(() => this.construireStatsVillages(), 500);
      },
      error: () => {}
    });

    // Cultures
    this.http.get<Culture[]>(
      `${this.apiUrl}/api/culture/cultures/ma-region`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: data => {
        const annee = new Date().getFullYear();
        const debut = new Date(annee - 1, 9, 1);
        const fin = new Date(annee, 7, 31);
        const filtrees = data.filter(c => {
          if (!c.dateSemence) return false;
          const date = new Date(c.dateSemence);
          return date >= debut && date <= fin;
        });
        this.cultures.set(filtrees);
        this.construireStatsVarietes();
        this.construireStatsVillages();
      },
      error: () => {}
    });

    // Récoltes
    this.http.get<Recolte[]>(
      `${this.apiUrl}/api/culture/recoltes/ma-region`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: data => {
        this.toutesRecoltes.set(data);
        const annees = [...new Set(data.map(r => {
          const date = new Date(r.dateRecolte);
          return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
        }))].sort((a, b) => b - a);
        const anneeCourante = new Date().getFullYear();
        if (!annees.includes(anneeCourante)) annees.unshift(anneeCourante);
        this.anneesDisponibles.set(annees);
        this.filtrerRecoltes();
        this.construireStatsVillages();
      },
      error: () => {}
    });

    // Surface cultivée
    this.http.get<any>(
      `${this.apiUrl}/api/culture/productions/ma-region/surface-cultivee`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: data => {
        this.surfaceCultivee.set(data.surfaceCultivee || 0);
        if (data.nomTerritoire && data.nomTerritoire !== 'Région') {
          this.nomRegion = data.nomTerritoire;
        }
      },
      error: () => {}
    });

    // Prévu vs Réel
    this.http.get<any>(
      `${this.apiUrl}/api/culture/recoltes/prevu-vs-reel`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: data => this.prevuVsReel.set(data),
      error: () => {}
    });
  }

  construireAgriculteurs(parcelles: Parcelle[]) {
    const map = new Map<number, Agriculteur>();
    parcelles.forEach(p => {
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

  construireStatsVarietes() {
    const map = new Map<string, number>();
    this.recoltes().forEach(r => {
      const v = r.varieteCulture || 'Inconnue';
      map.set(v, (map.get(v) || 0) + r.quantiteRecolte);
    });
    this.statsVariete.set(Object.fromEntries(map));
  }

  construireStatsVillages() {
    const parcelles = this.parcelles();
    const recoltes = this.recoltes();
    const cultures = this.cultures();
    if (parcelles.length === 0) return;

    const map = new Map<string, { production: number; cultures: number }>();
    parcelles.forEach(p => {
      const lieu = p.lieu || 'Non défini';
      if (!map.has(lieu)) map.set(lieu, { production: 0, cultures: 0 });
    });
    cultures.forEach(c => {
      const parcelle = parcelles.find(p => p.idParcel === c.idParcel);
      const lieu = parcelle?.lieu || 'Non défini';
      if (map.has(lieu)) map.get(lieu)!.cultures += 1;
    });
    recoltes.forEach(r => {
      const culture = cultures.find(c => c.idCulture === r.idCulture);
      if (culture) {
        const parcelle = parcelles.find(p => p.idParcel === culture.idParcel);
        const lieu = parcelle?.lieu || 'Non défini';
        if (map.has(lieu)) map.get(lieu)!.production += r.quantiteRecolte;
      }
    });
    const result = Array.from(map.entries())
      .map(([lieu, data]) => ({ lieu, ...data }))
      .sort((a, b) => b.production - a.production);
    this.statsVillages.set(result);
  }

 /*  filtrerRecoltes() {
    const debut = new Date(this.anneeCampagne - 1, 9, 1);
    const fin = new Date(this.anneeCampagne, 7, 31);
    const filtrees = this.toutesRecoltes().filter(r => {
      if (!r.dateRecolte) return false;
      const date = new Date(r.dateRecolte);
      return date >= debut && date <= fin;
    });
    this.recoltes.set(filtrees);
    this.construireStatsVarietes();
    this.construireStatsVillages();
  }
 */
 filtrerRecoltes() {
     const debut = new Date(this.anneeCampagne - 1, 9, 1);
     const fin = new Date(this.anneeCampagne, 7, 31);
     const filtrees = this.toutesRecoltes().filter(r => {
         if (!r.dateRecolte) return false;
         const date = new Date(r.dateRecolte);
         return date >= debut && date <= fin;
     });
     this.recoltes.set(filtrees);

     // ← Ajoute ce log
     const reel = filtrees.reduce((s, r) => s + r.quantiteRecolte, 0);
     const prevu = filtrees.reduce((s, r) => s + (r.quantiteRecoltePrevu || 0), 0);
     console.log('RECOLTES FILTREES:', filtrees.length);
     console.log('TOTAL REEL (kg):', reel);
     console.log('TOTAL PREVU (kg):', prevu);

     this.construireStatsVarietes();
     this.construireStatsVillages();
 }
  // ── KPI ──────────────────────────────────────────────
  getTotalRecolte(): number {
    return this.recoltes().reduce((sum, r) => sum + r.quantiteRecolte, 0);
  }

  getTotalPrevu(): number {
    return this.recoltes().reduce((sum, r) => sum + (r.quantiteRecoltePrevu || 0), 0);
  }

  /* getTauxGlobal(): number {
    const prevu = this.getTotalPrevu();
    if (!prevu) return 0;
    return Math.min(100, Math.round((this.getTotalRecolte() / prevu) * 100));
  } */
getTauxGlobal(): number {
    const prevu = this.getTotalPrevu();
    const reel = this.getTotalRecolte();
    console.log('Prévu:', prevu, 'Réel:', reel, 'Taux:', Math.round((reel/prevu)*100));
    if (!prevu) return 0;
    return Math.min(100, Math.round((reel / prevu) * 100));
}


  getTauxGlobalClass(): string {
    const val = this.getTauxGlobal();
    if (val >= 80) return 'taux-bon';
    if (val >= 50) return 'taux-moyen';
    return 'taux-faible';
  }

  getMaxProduction(): number {
    const vals = this.statsVillages().map(v => v.production);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }

  getMaxCultures(): number {
    const vals = this.statsVillages().map(v => v.cultures);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }

  // ── STATUT CULTURE ───────────────────────────────────
  getStatutCulture(culture: Culture): string {
    const estRecoltee = this.recoltes().some(r => r.idCulture === culture.idCulture);
    if (estRecoltee) return 'RECOLTEE';
    if (!culture.datePremierRecoltePrevu) return 'EN_COURS';
    const diff = Math.ceil((new Date(culture.datePremierRecoltePrevu).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (diff < 0) return 'EN_RETARD';
    if (diff <= 30) return 'PRETE';
    return 'EN_COURS';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'EN_COURS': 'En cours', 'PRETE': 'Prête',
      'EN_RETARD': 'En retard', 'RECOLTEE': 'Récoltée'
    };
    return labels[statut] || statut;
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'EN_COURS': 'statut-cours', 'PRETE': 'statut-prete',
      'EN_RETARD': 'statut-retard', 'RECOLTEE': 'statut-recoltee'
    };
    return classes[statut] || '';
  }

  getAvancement(culture: Culture): number {
    const estRecoltee = this.recoltes().some(r => r.idCulture === culture.idCulture);
    if (estRecoltee) return 100;
    if (!culture.dateSemence || !culture.datePremierRecoltePrevu) return 0;
    const debut = new Date(culture.dateSemence).getTime();
    const fin = new Date(culture.datePremierRecoltePrevu).getTime();
    const now = new Date().getTime();
    const total = fin - debut;
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((now - debut) / total) * 100)));
  }

  getAvancementColor(culture: Culture): string {
    const statut = this.getStatutCulture(culture);
    if (statut === 'RECOLTEE') return '#1b5e20';
    if (statut === 'EN_RETARD') return '#c62828';
    if (statut === 'PRETE') return '#f9a825';
    return '#1b5e20';
  }

  getDonutSegments(): { color: string; dasharray: string; dashoffset: string }[] {
    const stats = this.statsVariete();
    const keys = Object.keys(stats);
    if (keys.length === 0) return [];
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const colors = ['#1b5e20', '#388e3c', '#f9a825', '#e65100', '#00695c'];
    const circumference = 2 * Math.PI * 35;
    let offset = -10;
    return keys.slice(0, 5).map((key, i) => {
      const pct = stats[key] / total;
      const dash = pct * circumference;
      const seg = {
        color: colors[i % colors.length],
        dasharray: `${dash.toFixed(1)} ${(circumference - dash).toFixed(1)}`,
        dashoffset: `-${offset.toFixed(1)}`
      };
      offset += dash;
      return seg;
    });
  }

  getVillageColorProd(i: number): string {
    const colors = ['#1b5e20', '#388e3c', '#00695c', '#81c784', '#4caf50'];
    return colors[i % colors.length];
  }

  getVillageColorCult(i: number): string {
    const colors = ['#f9a825', '#ffb74d', '#e65100', '#ff8f00', '#ffd54f'];
    return colors[i % colors.length];
  }

  getVarieteColor(i: number): string {
    const colors = ['#1b5e20', '#388e3c', '#f9a825', '#e65100', '#00695c'];
    return colors[i % colors.length];
  }

  objectKeys(obj: { [key: string]: number } | null): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getMaxVal(obj: { [key: string]: number }): number {
    const vals = Object.values(obj);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }

  getTaux(reel: number, prevu: number): string {
    if (!prevu) return '—';
    return Math.round((reel / prevu) * 100) + '%';
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'accueil': 'Dashboard', 'agriculteurs': 'Agriculteurs',
      'parcelles': 'Parcelles', 'cultures': 'Cultures',
      'recoltes': 'Récoltes', 'production': 'Production',
      'analyse': 'Analyse rendement'
    };
    return titles[this.ongletActif] || 'Dashboard';
  }

  showMessage(msg: string, type: string) {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  logout() { this.authService.logout(); }
}
