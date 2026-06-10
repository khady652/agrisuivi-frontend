import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Parcelle } from '../../models/parcelle';
import { Culture } from '../../models/culture';
import { Recolte } from '../../models/recolte';
import { Meteo } from '../../models/meteo';

@Component({
  selector: 'app-dashboard-agriculteur',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard-agriculteur.html',
  styleUrl: './dashboard-agriculteur.css'
})
export class DashboardAgriculteur implements OnInit {

  ongletActif = 'accueil';
  message = '';
  messageType = '';
  nomAgriculteur = '';
  prenomAgriculteur = '';
  nomCooperative = '';
  anneeExperience = 0;
  niveauInstruction = '';
  adresse = '';
  chargement = signal(false);

  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  parcelles = signal<Parcelle[]>([]);
  cultures = signal<Culture[]>([]);
  recoltes = signal<Recolte[]>([]);
  meteo = signal<Meteo | null>(null);
  prixMarche = signal<any[]>([]);
  // Formulaire parcelle
  showFormParcelle = false;
  nouvelleParcelle = {
    nomParcelle: '', lieu: '', superficie: 0,
    typeSol: '', qualiteSol: '', sourceEau: '',
    estIrriguee: false, idDepartement: 1
  };

  // Formulaire culture
  showFormCulture = false;
  showFormModifierCulture = false;
  cultureAModifier: any = null;
  nouvelleCulture = {
    type: '', variete: '', dateSemence: '',
    typeIrrigation: '', quantiteSeme: 0,
    superficiCultive: 0, saison: '',
    intraUtilise: '', fumureOrganique: false,
    idParcel: 0
  };

  // Formulaire récolte
  showFormRecolte = false;
  nouvelleRecolte = {
    dateRecolte: '', quantiteRecolte: 0, idCulture: 0
  };

  // Chart rendement
  chartRendement: any = {
    series: [
      { name: 'Prévu (t)', data: [] },
      { name: 'Réel (t)', data: [] }
    ],
    chart: { type: 'bar', height: 180, toolbar: { show: false },
      animations: { enabled: true, speed: 800 } },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 3 } },
    dataLabels: { enabled: false },
    colors: ['#ddeadd', '#1b5e20'],
    xaxis: { categories: [] },
    tooltip: { y: { formatter: (val: number) => val.toFixed(2) + ' t' } },
    legend: { position: 'top' },
    grid: { borderColor: '#f0f7f0' }
  };

  totalParcelles = computed(() => this.parcelles().length);
  totalCultures = computed(() => this.cultures().length);
  totalRecoltes = computed(() => this.recoltes().length);

  /* totalProduction = computed(() =>
    this.recoltes().reduce((sum, r) => sum + r.quantiteRecolte, 0)
  ); */
totalProduction(): number {
  return this.recoltesCampagne().reduce((sum, r) => sum + r.quantiteRecolte, 0);
}
  /* totalPrevu = computed(() =>
    this.recoltes().reduce((sum, r) => sum + (r.quantiteRecoltePrevu || 0), 0)
  ); */
totalPrevu(): number {
  return this.recoltesCampagne().reduce((sum, r) => {
    if (!r.quantiteRecoltePrevu) return sum;
    const valeurKg = r.quantiteRecoltePrevu > 100000
      ? r.quantiteRecoltePrevu / 1000
      : r.quantiteRecoltePrevu;
    return sum + valeurKg;
  }, 0);
}

  tauxRealisation = computed(() => {
    const prevu = this.totalPrevu();
    if (!prevu) return 0;
    return Math.min(100, Math.round((this.totalProduction() / prevu) * 100));
  });

  culturesEnRetard = computed(() =>
    this.cultures().filter(c => {
      if (!c.datePremierRecoltePrevu) return false;
      return new Date(c.datePremierRecoltePrevu) < new Date() &&
        !this.recoltes().some(r => r.idCulture === c.idCulture);
    }).length
  );
anneeCampagne = new Date().getFullYear();
anneesDisponibles = signal<number[]>([]);

culturesCampagne = computed(() => {
  const annee = this.anneeCampagne;
  const debut = new Date(annee - 1, 9, 1);
  const fin = new Date(annee, 7, 31);
  return this.cultures().filter(c => {
    if (!c.dateSemence) return false;
    const date = new Date(c.dateSemence);
    return date >= debut && date <= fin;
  });
});

recoltesCampagne = computed(() => {
  const annee = this.anneeCampagne;
  const debut = new Date(annee - 1, 9, 1);
  const fin = new Date(annee, 7, 31);
  return this.recoltes().filter(r => {
    if (!r.dateRecolte) return false;
    const date = new Date(r.dateRecolte);
    return date >= debut && date <= fin;
  });
});

productionCampagne = computed(() =>
  this.recoltesCampagne().reduce((sum, r) => sum + r.quantiteRecolte, 0)
);
  conseilsAgricoles = computed(() => {
    const conseils: { icon: string; message: string; type: string }[] = [];
    if (this.culturesEnRetard() > 0) {
      conseils.push({
        icon: '⚠️',
        message: `${this.culturesEnRetard()} culture(s) en retard — Contactez votre chef coopératif`,
        type: 'danger'
      });
    }
    if (this.tauxRealisation() < 50) {
      conseils.push({
        icon: '📉',
        message: 'Taux de réalisation faible — Vérifiez vos pratiques d\'irrigation',
        type: 'warning'
      });
    }
    const culturesPret = this.cultures().filter(c => {
      if (!c.datePremierRecoltePrevu) return false;
      const diff = Math.ceil((new Date(c.datePremierRecoltePrevu).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return diff >= 0 && diff <= 30 && !this.recoltes().some(r => r.idCulture === c.idCulture);
    });
    if (culturesPret.length > 0) {
      conseils.push({
        icon: '✅',
        message: `${culturesPret.length} culture(s) prête(s) à récolter dans moins de 30 jours`,
        type: 'success'
      });
    }
    if (conseils.length === 0) {
      conseils.push({
        icon: '🌱',
        message: 'Tout va bien ! Continuez à surveiller vos cultures',
        type: 'info'
      });
    }
    return conseils;
  });

  private apiUrl = 'http://localhost:8080';
  private weatherApiKey = 'b40467460b659fbfabbd15ccf2d9ff8f';

  constructor(
    private http: HttpClient,
    private authService: Auth
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerDonnees();
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  changerOnglet(onglet: string) {
    this.ongletActif = onglet;
  }

  chargerProfil() {
    this.http.get<any>(
      `${this.apiUrl}/api/users/agriculteurs/mon-profil`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data: any) => {
        this.nomAgriculteur = data.nom || '';
        this.prenomAgriculteur = data.prenom || '';
        this.nomCooperative = data.nomCooperative || '';
        this.anneeExperience = data.anneeExperience || 0;
        this.niveauInstruction = data.niveauInstruction || '';
        this.adresse = data.adresse || '';
        this.chargerMeteo(data.adresse || 'Kaolack');
      },
      error: () => console.error('Erreur profil agriculteur')
    });
  }

 chargerDonnees() {
   this.http.get<Parcelle[]>(
     `${this.apiUrl}/api/culture/parcelles/mes-parcelles`,
     { headers: this.getHeaders() }
   ).subscribe({
     next: (data) => this.parcelles.set(data),
     error: () => {}
   });

   this.http.get<Culture[]>(
     `${this.apiUrl}/api/culture/cultures/mes-cultures`,
     { headers: this.getHeaders() }
   ).subscribe({
     next: (data) => {
       this.cultures.set(data);
       this.construireAnneesDisponibles();
       this.mettreAJourChartRendement();
     },
     error: () => {}
   });

   this.http.get<Recolte[]>(
     `${this.apiUrl}/api/culture/recoltes/mes-recoltes`,
     { headers: this.getHeaders() }
   ).subscribe({
     next: (data) => {
       this.recoltes.set(data);
       this.mettreAJourChartRendement();
     },
     error: () => {}
   });

   this.http.get<any[]>(`${this.apiUrl}/api/marche/collectes/derniers-prix`,
     { headers: this.getHeaders() })
     .subscribe({ next: d => this.prixMarche.set(Array.isArray(d) ? d : [d]), error: () => {} });

 } // ← FIN chargerDonnees

 getPrixMoyenMarche(): number {
   const p = this.prixMarche();
   if (!p.length) return 0;
   return Math.round(p.reduce((s, x) => s + x.prixUnitaire, 0) / p.length);
 }

 getAlertePrix(): { type: string; icon: string; message: string; conseil: string } {
   const prix = this.getPrixMoyenMarche();
   if (prix === 0) return { type: 'info', icon: 'fa-info-circle', message: 'Prix marché non disponible', conseil: 'Contactez votre coopérative' };
   if (prix >= 400) return { type: 'success', icon: 'fa-arrow-trend-up', message: `Prix actuel : ${prix.toLocaleString()} F/kg`, conseil: 'Bon moment pour vendre votre récolte !' };
   if (prix >= 250) return { type: 'warning', icon: 'fa-minus', message: `Prix actuel : ${prix.toLocaleString()} F/kg`, conseil: 'Prix moyen — attendez une hausse si possible' };
   return { type: 'danger', icon: 'fa-arrow-trend-down', message: `Prix actuel : ${prix.toLocaleString()} F/kg`, conseil: 'Prix bas — évitez de vendre maintenant' };
 }
  chargerMeteo(ville: string) {
    const city = ville.split(',')[0].trim();
    this.http.get<any>(
      `https://api.openweathermap.org/data/2.5/weather?q=${city},SN&appid=${this.weatherApiKey}&units=metric&lang=fr`
    ).subscribe({
      next: (data: any) => {
        this.meteo.set({
          temp: Math.round(data.main.temp),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          humidity: data.main.humidity,
          wind: Math.round(data.wind.speed * 3.6),
          city: data.name
        });
      },
      error: () => {
        this.meteo.set({
          temp: 32, description: 'Ensoleillé', icon: '01d',
          humidity: 65, wind: 15, city: city
        });
      }
    });
  }

  mettreAJourChartRendement() {
    const cultures = this.cultures();
    const recoltes = this.recoltes();
    if (cultures.length === 0) return;

    const categories = cultures.slice(0, 5).map(c => c.variete || c.type);
    const prevus = cultures.slice(0, 5).map(c => Math.round((c.quantiteRecoltePrevu || 0) / 1000 * 100) / 100);
    const reels = cultures.slice(0, 5).map(c => {
      const recolte = recoltes.find(r => r.idCulture === c.idCulture);
      return recolte ? Math.round(recolte.quantiteRecolte / 1000 * 100) / 100 : 0;
    });

    this.chartRendement = {
      ...this.chartRendement,
      series: [
        { name: 'Prévu (t)', data: prevus },
        { name: 'Réel (t)', data: reels }
      ],
      xaxis: { categories }
    };
  }

  // ── Parcelles ──────────────────────────────────
  ajouterParcelle() {
    this.http.post<any>(
      `${this.apiUrl}/api/culture/parcelles`,
      this.nouvelleParcelle,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.showMessage('Parcelle ajoutée avec succès !', 'success');
        this.showFormParcelle = false;
        this.chargerDonnees();
        this.resetFormParcelle();
      },
      error: () => this.showMessage('Erreur ajout parcelle !', 'error')
    });
  }

  resetFormParcelle() {
    this.nouvelleParcelle = {
      nomParcelle: '', lieu: '', superficie: 0,
      typeSol: '', qualiteSol: '', sourceEau: '',
      estIrriguee: false, idDepartement: 1
    };
  }

  // ── Cultures ───────────────────────────────────
  ajouterCulture() {
    this.http.post<any>(
      `${this.apiUrl}/api/culture/cultures`,
      this.nouvelleCulture,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.showMessage('Culture ajoutée avec succès !', 'success');
        this.showFormCulture = false;
        this.chargerDonnees();
        this.resetFormCulture();
      },
      error: () => this.showMessage('Erreur ajout culture !', 'error')
    });
  }

  resetFormCulture() {
    this.nouvelleCulture = {
      type: '', variete: '', dateSemence: '',
      typeIrrigation: '', quantiteSeme: 0,
      superficiCultive: 0, saison: '',
      intraUtilise: '', fumureOrganique: false,
      idParcel: 0
    };
  }

  // ── Récoltes ───────────────────────────────────
  enregistrerRecolte() {
    this.http.post<any>(
      `${this.apiUrl}/api/culture/recoltes`,
      this.nouvelleRecolte,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.showMessage('Récolte enregistrée avec succès !', 'success');
        this.showFormRecolte = false;
        this.chargerDonnees();
        this.resetFormRecolte();
      },
      error: () => this.showMessage('Erreur enregistrement récolte !', 'error')
    });
  }

  resetFormRecolte() {
    this.nouvelleRecolte = { dateRecolte: '', quantiteRecolte: 0, idCulture: 0 };
  }

  // ── Helpers ────────────────────────────────────
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
      'EN_RETARD': 'En retard', 'RECOLTEE': 'Récoltée', 'PLANIFIEE': 'Planifiée'
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
    const ecoule = now - debut;
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((ecoule / total) * 100)));
  }

  getAvancementColor(culture: Culture): string {
    const statut = this.getStatutCulture(culture);
    if (statut === 'RECOLTEE') return '#1b5e20';
    if (statut === 'EN_RETARD') return '#c62828';
    if (statut === 'PRETE') return '#f9a825';
    return '#1b5e20';
  }

  /* getCultureEmoji(type: string): string {
    const emojis: { [key: string]: string } = {
      'oignon': '🧅', 'tomate': '🍅', 'mais': '🌽',
      'riz': '🌾', 'arachide': '🥜', 'mil': '🌾',
      'niebe': '🫘', 'manioc': '🥔'
    };
    return emojis[type?.toLowerCase()] || '🌱';
  } */

  getMeteoEmoji(): string {
    const meteo = this.meteo();
    if (!meteo) return '🌤️';
    const icon = meteo.icon;
    if (icon.includes('01')) return '☀️';
    if (icon.includes('02') || icon.includes('03')) return '⛅';
    if (icon.includes('04')) return '☁️';
    if (icon.includes('09') || icon.includes('10')) return '🌧️';
    if (icon.includes('11')) return '⛈️';
    return '🌤️';
  }

  getTaux(reel: number, prevu: number): number {
    if (!prevu) return 0;
    return Math.min(100, Math.round((reel / prevu) * 100));
  }

  showMessage(msg: string, type: string) {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }
construireAnneesDisponibles() {
  const annees = [...new Set([
    ...this.cultures().map(c => {
      if (!c.dateSemence) return new Date().getFullYear();
      const date = new Date(c.dateSemence);
      return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
    }),
    ...this.recoltes().map(r => {
      if (!r.dateRecolte) return new Date().getFullYear();
      const date = new Date(r.dateRecolte);
      return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
    })
  ])].sort((a, b) => b - a);
  const anneeCourante = new Date().getFullYear();
  if (!annees.includes(anneeCourante)) annees.unshift(anneeCourante);
  this.anneesDisponibles.set(annees);
}

filtrerParCampagne() {
  this.mettreAJourChartRendement();
}
getStatsRecoltesByAnnee(): { annee: number; total: number }[] {
  const map = new Map<number, number>();
  this.recoltes().forEach(r => {
    if (!r.dateRecolte) return;
    const annee = new Date(r.dateRecolte).getFullYear();
    map.set(annee, (map.get(annee) || 0) + r.quantiteRecolte);
  });
  return Array.from(map.entries())
    .map(([annee, total]) => ({ annee, total }))
    .sort((a, b) => b.annee - a.annee);
}

/* getStatsSurfaceByAnnee(): { annee: number; surface: number }[] {
  const map = new Map<number, number>();
  this.cultures().forEach(c => {
    if (!c.dateSemence) return;
    const date = new Date(c.dateSemence);
    const annee = date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
    map.set(annee, (map.get(annee) || 0) + (c.superficiCultive || 0));
  });
  return Array.from(map.entries())
    .map(([annee, surface]) => ({ annee, surface }))
    .sort((a, b) => b.annee - a.annee);
} */
getStatsSurfaceByAnnee(): { annee: number; surface: number }[] {
  const map = new Map<number, number>();
  this.cultures().forEach(c => {
    if (!c.dateSemence) return;
    const annee = new Date(c.dateSemence).getFullYear();
    map.set(annee, (map.get(annee) || 0) + (c.superficiCultive || 0));
  });
  return Array.from(map.entries())
    .map(([annee, surface]) => ({ annee, surface }))
    .sort((a, b) => b.annee - a.annee);
}
getTotalSurface(): number {
  return this.cultures().reduce((sum, c) => sum + (c.superficiCultive || 0), 0);
}

getDonutRecoltes(): { color: string; dasharray: string; dashoffset: string }[] {
  const stats = this.getStatsRecoltesByAnnee();
  const total = stats.reduce((s, i) => s + i.total, 0);
  if (total === 0) return [];
  const colors = ['#1b5e20', '#f9a825', '#00695c', '#388e3c', '#e65100'];
  const circumference = 2 * Math.PI * 35;
  let offset = -10;
  return stats.map((item, i) => {
    const pct = item.total / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const seg = {
      color: colors[i % colors.length],
      dasharray: `${dash.toFixed(1)} ${gap.toFixed(1)}`,
      dashoffset: `-${offset.toFixed(1)}`
    };
    offset += dash;
    return seg;
  });
}
/* getDonutSurface(): { color: string; dasharray: string; dashoffset: string }[] {
  const stats = this.getStatsSurfaceByAnnee();
  const total = stats.reduce((s, i) => s + i.surface, 0);
  const colors = ['#f9a825', '#ffb300', '#e65100', '#ff8f00', '#1b5e20'];
  const circumference = 2 * Math.PI * 35;
  let offset = -10;
  return stats.map((item, i) => {
    const pct = item.surface / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const seg = {
      color: colors[i % colors.length],
      dasharray: `${dash.toFixed(1)} ${gap.toFixed(1)}`,
      dashoffset: `-${offset.toFixed(1)}`
    };
    offset += dash;
    return seg;
  });
} */
/* getDonutSurface(): { color: string; dasharray: string; dashoffset: string }[] {
  const stats = this.getStatsSurfaceByAnnee();
  const total = stats.reduce((s, i) => s + i.surface, 0);
  if (total === 0) return [];
  const colors = ['#1b5e20', '#f9a825', '#00695c', '#e65100', '#388e3c'];
  const circumference = 2 * Math.PI * 35;
  let offset = -10;
  return stats.map((item, i) => {
    const pct = item.surface / total;
    const dash = Math.max(pct * circumference, 3);
    const space = circumference - dash;
    const seg = {
      color: colors[i % colors.length],
      dasharray: `${dash.toFixed(1)} ${space.toFixed(1)}`,
      dashoffset: `-${offset.toFixed(1)}`
    };
    offset += dash;
    return seg;
  });
} */
 /* getDonutSurface(): { color: string; dasharray: string; dashoffset: string }[] {
   const stats = this.getStatsSurfaceByAnnee();
   const total = stats.reduce((s, i) => s + i.surface, 0);
   if (total === 0) return [];
   const colors = ['#1b5e20', '#f9a825', '#00695c', '#e65100', '#388e3c'];
   const circumference = 2 * Math.PI * 35;
   let offset = -10;
   let dashTotal = 0;
   return stats.map((item, i) => {
     const pct = item.surface / total;
     const isLast = i === stats.length - 1;
     const dash = isLast
       ? circumference - dashTotal
       : Math.max(pct * circumference, 3);
     const space = circumference - dash;
     const seg = {
       color: colors[i % colors.length],
       dasharray: `${dash.toFixed(1)} ${space.toFixed(1)}`,
       dashoffset: `-${offset.toFixed(1)}`
     };
     offset += dash;
     dashTotal += dash;
     return seg;
   });
 } */
getDonutSurface(): { color: string; dasharray: string; dashoffset: string }[] {
  const stats = this.getStatsSurfaceByAnnee();
  const total = stats.reduce((s, i) => s + i.surface, 0);
  if (total === 0) return [];
  const colors = ['#1565c0', '#6a1b9a', '#00695c', '#0288d1', '#4527a0'];
  const circumference = 2 * Math.PI * 35;
  let offset = -10;
  let dashTotal = 0;
  return stats.map((item, i) => {
    const pct = item.surface / total;
    const isLast = i === stats.length - 1;
    const dash = isLast
      ? circumference - dashTotal
      : Math.max(pct * circumference, 3);
    const space = circumference - dash;
    const seg = {
      color: colors[i % colors.length],
      dasharray: `${dash.toFixed(1)} ${space.toFixed(1)}`,
      dashoffset: `-${offset.toFixed(1)}`
    };
    offset += dash;
    dashTotal += dash;
    return seg;
  });
}
getDonutColor(i: number): string {
  const colors = ['#1b5e20', '#f9a825', '#00695c', '#e65100', '#388e3c'];
  return colors[i % colors.length];
}

/* getDonutColorSurface(i: number): string {
  const colors = ['#f9a825', '#1b5e20', '#ffb300', '#00695c', '#e65100'];
  return colors[i % colors.length];
} */
getDonutColorSurface(i: number): string {
  const colors = ['#1565c0', '#6a1b9a', '#00695c', '#0288d1', '#4527a0'];
  return colors[i % colors.length];
}
peutRecolter(idCulture: number): boolean {
  const culture = this.cultures().find(c => c.idCulture === idCulture);
  if (!culture || !culture.datePremierRecoltePrevu) return true;
  const datePrevu = new Date(culture.datePremierRecoltePrevu);
  const aujourdhui = new Date();
  const diff = Math.ceil((datePrevu.getTime() - aujourdhui.getTime()) / (1000 * 3600 * 24));
  return diff <= 10;
}

getJoursRestants(idCulture: number): number {
  const culture = this.cultures().find(c => c.idCulture === idCulture);
  if (!culture || !culture.datePremierRecoltePrevu) return 0;
  const datePrevu = new Date(culture.datePremierRecoltePrevu);
  const aujourdhui = new Date();
  return Math.ceil((datePrevu.getTime() - aujourdhui.getTime()) / (1000 * 3600 * 24));
}
supprimerCulture(id: number) {
  if (!confirm('Voulez-vous vraiment supprimer cette culture ?')) return;
  this.http.delete(
    `${this.apiUrl}/api/culture/cultures/${id}`,
    { headers: this.getHeaders() }
  ).subscribe({
    next: () => {
      this.showMessage('Culture supprimée !', 'success');
      this.chargerDonnees();
    },
    error: () => this.showMessage('Erreur suppression !', 'error')
  });
}
ouvrirModifierCulture(c: Culture) {
  this.cultureAModifier = { ...c };
  this.showFormModifierCulture = true;
  this.showFormCulture = false;
}

modifierCulture() {
  if (!this.cultureAModifier) return;
  this.http.put<any>(
    `${this.apiUrl}/api/culture/cultures/${this.cultureAModifier.idCulture}`,
    this.cultureAModifier,
    { headers: this.getHeaders() }
  ).subscribe({
    next: () => {
      this.showMessage('Culture modifiée avec succès !', 'success');
      this.showFormModifierCulture = false;
      this.cultureAModifier = null;
      this.chargerDonnees();
    },
    error: () => this.showMessage('Erreur modification !', 'error')
  });
}
//formatage de kg prevue en tonne
formatQuantiteML(quantite: number): string {
  if (!quantite) return 'Calcul...';
  // Si valeur > 100 000 kg → probablement en grammes
  const valeurKg = quantite > 100000 ? quantite / 1000 : quantite;
  return (valeurKg / 1000).toFixed(2) + ' t';
}
showFormModifierRecolte = false;
recolteAModifier: any = null;

ouvrirModifierRecolte(r: any) {
  this.recolteAModifier = { ...r };
  this.showFormModifierRecolte = true;
  this.showFormRecolte = false;
}

modifierRecolte() {
  if (!this.recolteAModifier) return;
  this.http.put<any>(
    `${this.apiUrl}/api/culture/recoltes/${this.recolteAModifier.idRecolte}`,
    {
      idCulture: this.recolteAModifier.idCulture,
      dateRecolte: this.recolteAModifier.dateRecolte,
      quantiteRecolte: this.recolteAModifier.quantiteRecolte
    },
    { headers: this.getHeaders() }
  ).subscribe({
    next: () => {
      this.showMessage('Récolte modifiée !', 'success');
      this.showFormModifierRecolte = false;
      this.recolteAModifier = null;
      this.chargerDonnees();
    },
    error: () => this.showMessage('Erreur modification !', 'error')
  });
}

supprimerRecolte(id: number) {
  if (!confirm('Voulez-vous vraiment supprimer cette récolte ?')) return;
  this.http.delete(
    `${this.apiUrl}/api/culture/recoltes/${id}`,
    { headers: this.getHeaders() }
  ).subscribe({
    next: () => {
      this.showMessage('Récolte supprimée !', 'success');
      this.chargerDonnees();
    },
    error: () => this.showMessage('Erreur suppression !', 'error')
  });
}
showFormModifierParcelle = false;
parcelleAModifier: any = null;

ouvrirModifierParcelle(p: any) {
  this.parcelleAModifier = { ...p };
  this.showFormModifierParcelle = true;
  this.showFormParcelle = false;
}

modifierParcelle() {
  if (!this.parcelleAModifier) return;
  this.http.put<any>(
    `${this.apiUrl}/api/culture/parcelles/${this.parcelleAModifier.idParcel}`,
    this.parcelleAModifier,
    { headers: this.getHeaders() }
  ).subscribe({
    next: () => {
      this.showMessage('Parcelle modifiée !', 'success');
      this.showFormModifierParcelle = false;
      this.parcelleAModifier = null;
      this.chargerDonnees();
    },
    error: () => this.showMessage('Erreur modification !', 'error')
  });
}

supprimerParcelle(id: number) {
  if (!confirm('Voulez-vous vraiment supprimer cette parcelle ?')) return;
  this.http.delete(
    `${this.apiUrl}/api/culture/parcelles/${id}`,
    { headers: this.getHeaders() }
  ).subscribe({
    next: () => {
      this.showMessage('Parcelle supprimée !', 'success');
      this.chargerDonnees();
    },
    error: () => this.showMessage('Erreur suppression !', 'error')
  });
}
  logout() { this.authService.logout(); }
}
