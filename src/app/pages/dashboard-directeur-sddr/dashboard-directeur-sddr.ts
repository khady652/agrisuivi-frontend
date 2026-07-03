import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { CultureService } from '../../services/culture';
import { Culture } from '../../models/culture';
import { Parcelle } from '../../models/parcelle';
import { Recolte, RapportAgricole } from '../../models/recolte';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ChangeDetectorRef } from '@angular/core';
interface Agriculteur {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  parcelles: Parcelle[];
}

interface HistoriquePoint {
  annee: number;
  surfaceCultivee: number;
}

interface Cooperative {
  idCooperative: number;
  nomCooperative: string;
  adresse?: string;
  nombreMembres?: number;
  dateCreation?: string;
  nomChef?: string;
  prenomChef?: string;
  telephoneChef?: string;
}

@Component({
  selector: 'app-dashboard-directeur-sddr',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
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
  historiqueSurface = signal<HistoriquePoint[]>([]);
  chargement = signal(false);
  anneeRapport = new Date().getFullYear();
  anneeCampagne = new Date().getFullYear();
  toutesRecoltes = signal<Recolte[]>([]);
  productionMensuelle = signal<any[]>([]);
  anneesDisponibles = signal<number[]>([]);
  statsVillages = signal<{ lieu: string; production: number; cultures: number; surfaceCultivee: number }[]>([]);
  cooperatives = signal<Cooperative[]>([]);

  // Modal détails culture
  showModalCulture = false;
  cultureSelectionnee: any = null;

  // Modal détails récolte
  showModalRecolte = false;
  recolteSelectionnee: any = null;

  // Modal détails coopérative
  showModalCoop = false;
  coopSelectionnee: Cooperative | null = null;

  chartVarietes: any = {
    series: [],
    chart: { type: 'bar', height: 250, toolbar: { show: false }, animations: { enabled: true, speed: 800 } },
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
    chart: { type: 'area', height: 280, toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 800 } },
    dataLabels: { enabled: false },
    colors: ['#1b5e20', '#f9a825'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: [] },
    yaxis: [{ title: { text: 'Surface (m²)' } }, { opposite: true, title: { text: 'Production (kg)' } }],
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

  miniChartParcelles: any = {
    series: [{ name: 'Parcelles', data: [] }],
    chart: { type: 'area', height: 80, sparkline: { enabled: true } },
    colors: ['#00695c'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.3 },
    tooltip: { fixed: { enabled: false } }
  };

  totalParcelles = computed(() => this.parcelles().length);
  totalCultures = computed(() => this.cultures().length);
  totalRecoltes = computed(() => this.recoltes().length);
  totalCooperatives = computed(() => this.cooperatives().length);

  culturesEnRetard = computed(() =>
    this.cultures().filter((c: Culture) => {
      if (!c.datePremierRecoltePrevu) return false;
      return new Date(c.datePremierRecoltePrevu) < new Date();
    }).length
  );

  svgPath = computed(() => {
    const data = this.historiqueSurface();
    if (!data || data.length === 0) return { area: '', line: '', points: [], width: 400, height: 110 };
    const W = 400, H = 110;
    const paddingBottom = 20, paddingTop = 10;
    const chartH = H - paddingBottom - paddingTop;
    const maxVal = Math.max(...data.map(d => d.surfaceCultivee), 1);
    const minVal = Math.min(...data.map(d => d.surfaceCultivee), 0);
    const range = maxVal - minVal || 1;
    const points = data.map((d, i) => ({
      x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
      y: paddingTop + chartH - ((d.surfaceCultivee - minVal) / range) * chartH,
      annee: d.annee, val: d.surfaceCultivee
    }));
    let line = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]; const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      line += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    const area = `${line} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`;
    return { area, line, points, width: W, height: H };
  });

  searchCulture = signal('');
  searchRecolte = signal('');
  searchAgriculteur = signal('');
  searchParcelle = signal('');

  culturesFiltrees = computed(() => {
    const q = this.searchCulture().toLowerCase();
    if (!q) return this.cultures();
    return this.cultures().filter((c: Culture) =>
      c.type?.toLowerCase().includes(q) || c.variete?.toLowerCase().includes(q) ||
      c.nomParcelle?.toLowerCase().includes(q) || c.saison?.toLowerCase().includes(q)
    );
  });

  recoltesFiltrees = computed(() => {
    const q = this.searchRecolte().toLowerCase();
    if (!q) return this.recoltes();
    return this.recoltes().filter((r: Recolte) =>
      r.typeCulture?.toLowerCase().includes(q) || r.varieteCulture?.toLowerCase().includes(q) ||
      r.nomParcelle?.toLowerCase().includes(q)
    );
  });

  agriculteursFiltres = computed(() => {
    const q = this.searchAgriculteur().toLowerCase();
    if (!q) return this.agriculteurs();
    return this.agriculteurs().filter((a: Agriculteur) =>
      a.nom?.toLowerCase().includes(q) || a.prenom?.toLowerCase().includes(q)
    );
  });

  parcellesFiltrees = computed(() => {
    const q = this.searchParcelle().toLowerCase();
    if (!q) return this.parcelles();
    return this.parcelles().filter((p: Parcelle) =>
      p.nomParcelle?.toLowerCase().includes(q) || p.lieu?.toLowerCase().includes(q) ||
      p.nomAgriculteur?.toLowerCase().includes(q)
    );
  });

  private apiUrl = 'http://localhost:8080';

  constructor(
    private http: HttpClient,
    private authService: Auth,
    private cultureService: CultureService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerDonnees();
    this.chargerStats();
    this.chargerProductionMensuelle();
    this.chargerCooperatives();
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
        this.nomDepartement = data.nomServiceDepartementale || data.nomDepartement || '';
      },
      error: () => console.error('Erreur profil SDDR')
    });
  }

  chargerCooperatives() {
    this.http.get<Cooperative[]>(
      `${this.apiUrl}/api/users/cooperatives`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => this.cooperatives.set(data),
      error: () => {}
    });
  }

  chargerDonnees() {
    this.chargement.set(true);
    this.cultureService.getParcellesDepartement().subscribe({
      next: (data: Parcelle[]) => {
        this.parcelles.set(data);
        this.construireAgriculteurs(data);
        this.chargement.set(false);
        setTimeout(() => this.construireStatsVillages(), 1000);
      },
      error: () => { this.showMessage('Erreur chargement parcelles !', 'error'); this.chargement.set(false); }
    });
    this.cultureService.getCulturesDepartement().subscribe({
      next: (data: Culture[]) => {
        const annee = new Date().getFullYear();
        const debut = new Date(annee - 1, 9, 1);
        const fin = new Date(annee, 7, 31);
        const filtrees = data.filter(c => {
          if (!c.dateSemence) return false;
          const date = new Date(c.dateSemence);
          return date >= debut && date <= fin;
        });
        this.cultures.set(filtrees);
        this.construireStatsVillages();
      },
      error: () => this.showMessage('Erreur chargement cultures !', 'error')
    });
    this.cultureService.getRecoltesDepartement().subscribe({
      next: (data: Recolte[]) => {
        this.toutesRecoltes.set(data);
        const annees = [...new Set(data.map(r => {
          const date = new Date(r.dateRecolte);
          return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
        }))].sort((a, b) => b - a);
        const anneeCourante = new Date().getFullYear();
        if (!annees.includes(anneeCourante)) annees.unshift(anneeCourante);
        this.anneesDisponibles.set(annees);
        const annee = this.anneeCampagne;
        const debut = new Date(annee - 1, 9, 1);
        const fin = new Date(annee, 7, 31);
        const filtrees = data.filter(r => {
          if (!r.dateRecolte) return false;
          const date = new Date(r.dateRecolte);
          return date >= debut && date <= fin;
        });
        this.recoltes.set(filtrees);
        this.construireStatsVariete();
        this.construireStatsVillages();
        this.construireChartVarietes();
        setTimeout(() => this.construireChartVarietes(), 1500);
      },
      error: () => this.showMessage('Erreur chargement récoltes !', 'error')
    });
    this.cultureService.getSurfaceCultivee().subscribe({
      next: (data: any) => {
        this.surfaceCultivee.set(data.surfaceCultivee || 0);
        if (data.nomTerritoire) this.nomDepartement = data.nomTerritoire;
      },
      error: () => {}
    });
    this.cultureService.getHistoriqueSurface().subscribe({
      next: (data: HistoriquePoint[]) => {
        this.historiqueSurface.set([...data].sort((a, b) => a.annee - b.annee));
      },
      error: () => {}
    });
  }

  /* chargerStats() {
    this.cultureService.getStatsParVariete().subscribe({ next: (data) => this.statsVariete.set(data), error: () => {} });
    this.cultureService.getStatsParType().subscribe({ next: (data) => this.statsType.set(data), error: () => {} });
    this.cultureService.getPrevuVsReel().subscribe({ next: (data) => this.prevuVsReel.set(data), error: () => {} });
  } */
chargerStats() {
  this.construireStatsVariete();
  this.cultureService.getStatsParType().subscribe({ next: (data) => this.statsType.set(data), error: () => {} });
  this.cultureService.getPrevuVsReel().subscribe({ next: (data) => this.prevuVsReel.set(data), error: () => {} });
}
  chargerProductionMensuelle() {
    this.cultureService.getProductionMensuelle().subscribe({
      next: (data: any[]) => {
        this.productionMensuelle.set(data);
        this.chartOptions = {
          ...this.chartOptions,
          series: [
            { name: 'Surface cultivée (m²)', data: data.map(d => d.surfaceCultivee) },
            { name: 'Production (kg)', data: data.map(d => d.productionKg) }
          ],
          xaxis: { categories: data.map(d => d.mois) }
        };
        this.miniChartCultures = { ...this.miniChartCultures, series: [{ name: 'Cultures', data: data.map(d => d.nombreCultures) }] };
        this.miniChartParcelles = { ...this.miniChartParcelles, series: [{ name: 'Récoltes', data: data.map(d => d.nombreRecoltes) }] };
        this.construireChartVarietes();
      },
      error: (err: any) => console.error(err)
    });
  }

  construireStatsVillages() {
    const parcelles = this.parcelles();
    const recoltes = this.recoltes();
    const cultures = this.cultures();
    if (parcelles.length === 0) return;

    const map = new Map<string, { production: number; cultures: number; surfaceCultivee: number }>();
    parcelles.forEach((p: Parcelle) => {
      const lieu = p.lieu || 'Non défini';
      if (!map.has(lieu)) map.set(lieu, { production: 0, cultures: 0, surfaceCultivee: 0 });
      if (p.superficie) map.get(lieu)!.surfaceCultivee += p.superficie;
    });
    cultures.forEach((c: Culture) => {
      const parcelle = parcelles.find(p => p.idParcel === c.idParcel);
      const lieu = parcelle?.lieu || 'Non défini';
      if (map.has(lieu)) map.get(lieu)!.cultures += 1;
    });
    recoltes.forEach((r: Recolte) => {
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

  getMaxProduction(): number { const vals = this.statsVillages().map(v => v.production); return vals.length > 0 ? Math.max(...vals) : 1; }
  getMaxCultures(): number { const vals = this.statsVillages().map(v => v.cultures); return vals.length > 0 ? Math.max(...vals) : 1; }
  getMaxSurface(): number { const vals = this.statsVillages().map(v => v.surfaceCultivee); return vals.length > 0 ? Math.max(...vals) : 1; }
  getVillageColorProd(i: number): string { return ['#1b5e20', '#388e3c', '#00695c', '#81c784', '#4caf50'][i % 5]; }
  getVillageColorCult(i: number): string { return ['#f9a825', '#ffb74d', '#e65100', '#ff8f00', '#ffd54f'][i % 5]; }


 ouvrirDetailsCulture(c: any) {
     const parcelle = this.parcelles().find(p => p.idParcel === c.idParcel);

     this.cultureSelectionnee = {
         ...c,
         lieu: parcelle?.lieu || '—',
         nomAgriculteur: parcelle ? `${parcelle.prenomAgriculteur} ${parcelle.nomAgriculteur}` : '—',
         telephoneAgriculteur: '—'
     };
     this.showModalCulture = true;

     const idAgri = parcelle?.idAgriculteur;
     if (idAgri) {
         this.http.get<any>(
             `${this.apiUrl}/api/users/agriculteurs/${idAgri}/info`,
             { headers: this.getHeaders() }
         ).subscribe({
             next: (data) => {
                 this.cultureSelectionnee = Object.assign({}, this.cultureSelectionnee, {
                     nomAgriculteur: `${data.prenom} ${data.nom}`,
                     telephoneAgriculteur: data.telephone || '—'
                 });
               this.cdr.detectChanges();
             },
             error: () => {}
         });
     }
 }

 fermerModalCulture() { this.showModalCulture = false; this.cultureSelectionnee = null; }

 ouvrirDetailsRecolte(r: any) {
     const culture = this.cultures().find(c => c.idCulture === r.idCulture);
     const parcelle = this.parcelles().find(p => p.idParcel === culture?.idParcel);

     this.recolteSelectionnee = {
         ...r,
         lieu: parcelle?.lieu || '—',
         nomAgriculteur: parcelle ? `${parcelle.prenomAgriculteur} ${parcelle.nomAgriculteur}` : '—',
         telephoneAgriculteur: '—',
         saison: culture?.saison || '—'
     };
     this.showModalRecolte = true;

     const idAgri = parcelle?.idAgriculteur;
     if (idAgri) {
         this.http.get<any>(
             `${this.apiUrl}/api/users/agriculteurs/${idAgri}/info`,
             { headers: this.getHeaders() }
         ).subscribe({
             next: (data) => {
                 this.recolteSelectionnee = Object.assign({}, this.recolteSelectionnee, {
                     nomAgriculteur: `${data.prenom} ${data.nom}`,
                     telephoneAgriculteur: data.telephone || '—'
                 });
               this.cdr.detectChanges();
             },
             error: () => {}
         });
     }
 }

 fermerModalRecolte() { this.showModalRecolte = false; this.recolteSelectionnee = null; }
  // ── MODAL COOPÉRATIVE ────────────────────────────────
  ouvrirDetailsCoop(c: Cooperative) { this.coopSelectionnee = c; this.showModalCoop = true; }
  fermerModalCoop() { this.showModalCoop = false; this.coopSelectionnee = null; }

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
        a.href = url; a.download = `rapport_${this.nomDepartement}_${this.anneeRapport}.pdf`;
        a.click(); URL.revokeObjectURL(url);
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
          id: p.idAgriculteur, nom: p.nomAgriculteur || '',
          prenom: p.prenomAgriculteur || '',
          /* telephone: (p as any).telephoneAgriculteur || '',
          email: (p as any).emailAgriculteur || '',
          adresse: (p as any).adresseAgriculteur || '', */
          telephone: (p as any).telephoneAgriculteur || '',
          email: (p as any).emailAgriculteur || '',
          adresse: (p as any).adresseAgriculteur || '',
          parcelles: []
        });
      }
      map.get(p.idAgriculteur)!.parcelles.push(p);
    });
    this.agriculteurs.set(Array.from(map.values()));
  }

  getChartViewBox(): string { const s = this.svgPath(); return `0 0 ${s.width} ${s.height}`; }

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
      const gap = circumference - dash;
      const segment = { color: colors[i % colors.length], dasharray: `${dash.toFixed(1)} ${gap.toFixed(1)}`, dashoffset: `-${offset.toFixed(1)}` };
      offset += dash;
      return segment;
    });
  }

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
    return { 'EN_COURS': 'En cours', 'PRETE': 'Prête', 'EN_RETARD': 'En retard', 'RECOLTEE': 'Récoltée', 'PLANIFIEE': 'Planifiée' }[statut] || statut;
  }

  getStatutClass(statut: string): string {
    return { 'EN_COURS': 'statut-cours', 'PRETE': 'statut-prete', 'EN_RETARD': 'statut-retard', 'RECOLTEE': 'statut-recoltee', 'PLANIFIEE': 'statut-planifiee' }[statut] || '';
  }

  getTauxClass(taux: string): string { const val = parseInt(taux); return val >= 80 ? 'taux-bon' : val >= 50 ? 'taux-moyen' : 'taux-faible'; }
  getTaux(reel: number, prevu: number): string { if (!prevu) return '—'; return Math.round((reel / prevu) * 100) + '%'; }
  getVarieteColor(index: number): string { return ['#1b5e20', '#388e3c', '#f9a825', '#e65100', '#00695c'][index % 5]; }
  objectKeys(obj: { [key: string]: number } | null): string[] { return obj ? Object.keys(obj) : []; }
  getMaxVal(obj: { [key: string]: number }): number { const vals = Object.values(obj); return vals.length > 0 ? Math.max(...vals) : 1; }

  showMessage(msg: string, type: string) {
    this.message = msg; this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getPageTitle(): string {
    return { 'accueil': 'Dashboard', 'agriculteurs': 'Agriculteurs', 'parcelles': 'Parcelles', 'cultures': 'Cultures', 'recoltes': 'Récoltes', 'analyse': 'Analyse rendement', 'rapport': 'Rapport agricole', 'production': 'Production', 'cooperatives': 'Coopératives' }[this.ongletActif] || 'Dashboard';
  }

  getAvancement(culture: Culture): number {
    const estRecoltee = this.recoltes().some(r => r.idCulture === culture.idCulture);
    if (estRecoltee) return 100;
    if (!culture.dateSemence || !culture.datePremierRecoltePrevu) return 0;
    const debut = new Date(culture.dateSemence).getTime();
    const fin = new Date(culture.datePremierRecoltePrevu).getTime();
    const now = new Date().getTime();
    return Math.min(100, Math.max(0, Math.round(((now - debut) / (fin - debut)) * 100)));
  }

  getAvancementColor(culture: Culture): string {
    if (this.recoltes().some(r => r.idCulture === culture.idCulture)) return '#1b5e20';
    const statut = this.getStatutCulture(culture);
    if (statut === 'EN_RETARD') return '#c62828';
    if (statut === 'PRETE') return '#f9a825';
    return '#1b5e20';
  }

  /* filtrerRecoltes() {
    const debut = new Date(this.anneeCampagne - 1, 9, 1);
    const fin = new Date(this.anneeCampagne, 7, 31);
    this.recoltes.set(this.toutesRecoltes().filter(r => {
      if (!r.dateRecolte) return false;
      const date = new Date(r.dateRecolte);
      return date >= debut && date <= fin;
    }));
  } */
filtrerRecoltes() {
  const debut = new Date(this.anneeCampagne - 1, 9, 1);
  const fin = new Date(this.anneeCampagne, 7, 31);
  this.recoltes.set(this.toutesRecoltes().filter(r => {
    if (!r.dateRecolte) return false;
    const date = new Date(r.dateRecolte);
    return date >= debut && date <= fin;
  }));
  this.construireStatsVariete();
  this.construireStatsVillages();
  this.construireChartVarietes();
}

  getTotalRecolte(): number { return this.recoltes().reduce((sum, r) => sum + r.quantiteRecolte, 0); }
  getTotalPrevu(): number { return this.recoltes().reduce((sum, r) => sum + (r.quantiteRecoltePrevu || 0), 0); }
  getTauxGlobal(): number { const prevu = this.getTotalPrevu(); if (!prevu) return 0; return Math.min(100, Math.round((this.getTotalRecolte() / prevu) * 100)); }
  getTauxGlobalClass(): string { const val = this.getTauxGlobal(); return val >= 80 ? 'taux-bon' : val >= 50 ? 'taux-moyen' : 'taux-faible'; }

  /* construireChartVarietes() {
    const recoltes = this.recoltes();
    const moisLabels = this.productionMensuelle().map(d => d.mois);
    if (moisLabels.length === 0) return;
    const varietes = [...new Set(recoltes.map(r => r.varieteCulture))];
    const series = varietes.map(variete => ({
      name: variete,
      data: moisLabels.map(mois => {
        const total = recoltes.filter(r => {
          if (r.varieteCulture !== variete || !r.dateRecolte) return false;
          const date = new Date(r.dateRecolte);
          return mois.toLowerCase().includes(date.toLocaleDateString('fr-FR', { month: 'short' }).toLowerCase()) && mois.includes(String(date.getFullYear()));
        }).reduce((sum, r) => sum + r.quantiteRecolte / 1000, 0);
        return Math.round(total * 100) / 100;
      })
    }));
    this.chartVarietes = { ...this.chartVarietes, series, xaxis: { categories: moisLabels } };
  } */
construireChartVarietes() {
    const moisLabels = this.productionMensuelle().map(d => d.mois);
    if (moisLabels.length === 0) return;

    const recoltes = this.recoltes();
    console.log('recoltes:', recoltes.map(r => ({ variete: r.varieteCulture, date: r.dateRecolte })));

    const varietes = [...new Set(recoltes.map(r => r.varieteCulture).filter(v => v))];
    console.log('varietes:', varietes);

    const series = varietes.map(variete => ({
        name: variete,
        data: this.productionMensuelle().map(mois => {
            const total = recoltes
                .filter(r => {
                    if (r.varieteCulture !== variete || !r.dateRecolte) return false;
                    const date = new Date(r.dateRecolte);
                    return date.getMonth() + 1 === mois.moisNum
                        && date.getFullYear() === mois.annee;
                })
                .reduce((sum, r) => sum + r.quantiteRecolte / 1000, 0);
            return Math.round(total * 100) / 100;
        })
    }));

    setTimeout(() => {
          this.chartVarietes = {
              ...this.chartVarietes,
              series,
              xaxis: { categories: moisLabels }
          };
          this.cdr.detectChanges();
      }, 100);
    }

    construireStatsVariete() {
      const recoltes = this.recoltes(); // déjà filtré par campagne
      const map = new Map<string, number>();
      recoltes.forEach(r => {
        if (!r.varieteCulture) return;
        map.set(r.varieteCulture, (map.get(r.varieteCulture) || 0) + r.quantiteRecolte);
      });
      const trie = [...map.entries()].sort((a, b) => b[1] - a[1]); // tri décroissant
      this.statsVariete.set(Object.fromEntries(trie));
    }
  logout() { this.authService.logout(); }
}
