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

  // ── ApexCharts ────────────────────────────────────────
  productionMensuelle = signal<any[]>([]);

  chartOptions: any = {
    series: [
      { name: 'Surface cultivée (m²)', data: [] },
      { name: 'Production (kg)', data: [] }
    ],
    chart: {
      type: 'area',
      height: 280,
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    colors: ['#1b5e20', '#f9a825'],
    dataLabels: { enabled: false },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 }
    },
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

  miniChartParcelles: any = {
    series: [{ name: 'Parcelles', data: [] }],
    chart: { type: 'area', height: 80, sparkline: { enabled: true } },
    colors: ['#00695c'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.3 },
    tooltip: { fixed: { enabled: false } }
  };

  // ── Computed ──────────────────────────────────────────
  totalParcelles = computed(() => this.parcelles().length);
  totalCultures = computed(() => this.cultures().length);
  totalRecoltes = computed(() => this.recoltes().length);

  culturesEnRetard = computed(() =>
    this.cultures().filter((c: Culture) => {
      if (!c.datePremierRecoltePrevu) return false;
      return new Date(c.datePremierRecoltePrevu) < new Date();
    }).length
  );

  // ── SVG dynamique (historique annuel) ─────────────────
  svgPath = computed(() => {
    const data = this.historiqueSurface();
    if (!data || data.length === 0)
      return { area: '', line: '', points: [], width: 400, height: 110 };

    const W = 400, H = 110;
    const paddingBottom = 20, paddingTop = 10;
    const chartH = H - paddingBottom - paddingTop;
    const maxVal = Math.max(...data.map(d => d.surfaceCultivee), 1);
    const minVal = Math.min(...data.map(d => d.surfaceCultivee), 0);
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => ({
      x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
      y: paddingTop + chartH - ((d.surfaceCultivee - minVal) / range) * chartH,
      annee: d.annee,
      val: d.surfaceCultivee
    }));

    let line = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      line += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    const area = `${line} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`;
    return { area, line, points, width: W, height: H };
  });

  // ── Search ────────────────────────────────────────────
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
    this.chargerProductionMensuelle();
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

  chargerDonnees() {
    this.chargement.set(true);
    this.cultureService.getParcellesDepartement().subscribe({
      next: (data: Parcelle[]) => {
        this.parcelles.set(data);
        this.construireAgriculteurs(data);
        this.chargement.set(false);
      },
      error: () => {
        this.showMessage('Erreur chargement parcelles !', 'error');
        this.chargement.set(false);
      }
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
      next: (data: HistoriquePoint) => this.surfaceCultivee.set(data.surfaceCultivee || 0),
      error: () => {}
    });
    this.cultureService.getHistoriqueSurface().subscribe({
      next: (data: HistoriquePoint[]) => {
        const sorted = [...data].sort((a, b) => a.annee - b.annee);
        this.historiqueSurface.set(sorted);
      },
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

  chargerProductionMensuelle() {
    this.cultureService.getProductionMensuelle().subscribe({
      next: (data: any[]) => {
        this.productionMensuelle.set(data);

        // ✅ Graphique principal area chart
        this.chartOptions = {
          ...this.chartOptions,
          series: [
            { name: 'Surface cultivée (m²)', data: data.map(d => d.surfaceCultivee) },
            { name: 'Production (kg)', data: data.map(d => d.productionKg) }
          ],
          xaxis: { categories: data.map(d => d.mois) }
        };

        // ✅ Mini chart cultures
        this.miniChartCultures = {
          ...this.miniChartCultures,
          series: [{ name: 'Cultures', data: data.map(d => d.nombreCultures) }]
        };

        // ✅ Mini chart parcelles (nombre de récoltes par mois)
        this.miniChartParcelles = {
          ...this.miniChartParcelles,
          series: [{ name: 'Récoltes', data: data.map(d => d.nombreRecoltes) }]
        };
      },
      error: () => {}
    });
  }

  chargerRapport() {
    this.chargement.set(true);
    this.cultureService.getRapport(this.anneeRapport).subscribe({
      next: (data: RapportAgricole) => {
        this.rapport.set(data);
        this.chargement.set(false);
      },
      error: () => {
        this.showMessage('Erreur chargement rapport !', 'error');
        this.chargement.set(false);
      }
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

  // ── SVG helpers ───────────────────────────────────────
  getChartViewBox(): string {
    const s = this.svgPath();
    return `0 0 ${s.width} ${s.height}`;
  }

  getMaxSurface(): number {
    const data = this.historiqueSurface();
    return data.length > 0 ? Math.max(...data.map(d => d.surfaceCultivee)) : 0;
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
      const gap = circumference - dash;
      const segment = {
        color: colors[i % colors.length],
        dasharray: `${dash.toFixed(1)} ${gap.toFixed(1)}`,
        dashoffset: `-${offset.toFixed(1)}`
      };
      offset += dash;
      return segment;
    });
  }

  // ── Statut culture ────────────────────────────────────
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
      'EN_RETARD': 'statut-retard', 'RECOLTEE': 'statut-recoltee',
      'PLANIFIEE': 'statut-planifiee'
    };
    return classes[statut] || '';
  }

  getTauxClass(taux: string): string {
    const val = parseInt(taux);
    if (val >= 80) return 'taux-bon';
    if (val >= 50) return 'taux-moyen';
    return 'taux-faible';
  }

  getTaux(reel: number, prevu: number): string {
    if (!prevu) return '—';
    return Math.round((reel / prevu) * 100) + '%';
  }

  getVarieteColor(index: number): string {
    const colors = ['#1b5e20', '#388e3c', '#f9a825', '#e65100', '#00695c'];
    return colors[index % colors.length];
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
      'accueil': 'Dashboard', 'agriculteurs': 'Agriculteurs',
      'parcelles': 'Parcelles', 'cultures': 'Cultures',
      'recoltes': 'Récoltes', 'analyse': 'Analyse rendement',
      'rapport': 'Rapport agricole'
    };
    return titles[this.ongletActif] || 'Dashboard';
  }

  logout() { this.authService.logout(); }
}
