import { Component, OnInit, signal, AfterViewInit} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';
import {
  ProfilDecideur,
  RecoltDecideur,
  StockAlert,
  CollecteDecideur,
  Prevision,
  Notification,
  Enqueteur,
  Marche,
  AlerteDecideur
} from '../../models/decideur';

import * as L from 'leaflet';

@Component({
  selector: 'app-dashboard-decideur',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard-decideur.html',
  styleUrls: ['./dashboard-decideur.css']
})
export class DashboardDecideur implements OnInit, AfterViewInit {

  private apiUrl = 'http://localhost:8080';
  ongletActif = 'accueil';
  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  nomDecideur = signal('');
  prenomDecideur = signal('');
  telephoneDecideur = signal('');
  adresseDecideur = signal('');
  emailDecideur = signal('');

  message = '';
  messageType = 'success';
  showNotifDropdown = false;

  stockAlert = signal<StockAlert | null>(null);
  collectes = signal<CollecteDecideur[]>([]);
  recoltes = signal<RecoltDecideur[]>([]);
  prevision = signal<Prevision | null>(null);
  statsParRegion = signal<{ [key: string]: number }>({});
  marches = signal<Marche[]>([]);
  enqueteurs = signal<Enqueteur[]>([]);
  alertes = signal<AlerteDecideur[]>([]);
  nbAlertesNonLues = signal<number>(0);
  donneesGraphique = signal<{ mois: string; prixMoyen: number; stockTotal: number }[]>([]);

  chartPrixOptions: any = {
    series: [],
    chart: { type: 'line', height: 220, toolbar: { show: false } },
    xaxis: { categories: [] }
  };

  chartStockOptions: any = {
    series: [],
    chart: { type: 'line', height: 220, toolbar: { show: false } },
    xaxis: { categories: [] }
  };

  // Formulaire marché
  showFormMarche = false;
  showFormModifierMarche = false;
  marcheAModifier: any = null;
  nouveauMarche = { nomMarche: '', lieu: '', type: '' };

  // Formulaire enquêteur
  showFormEnqueteur = false;
  showFormModifierEnqueteur = false;
  enqueteurAModifier: any = null;
  nouvelEnqueteur = {
    nom: '', prenom: '', email: '', telephone: '',
    organisation: '', zoneAffectation: '', adresse: ''
  };

  // Profil
  showProfilPopup = false;
  showFormProfil = false;
  profilAModifier: any = null;
  idDecideur: number = 0;

  private mapProduction: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: Auth
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerDonnees();
    this.chargerDonneesGraphique();
    this.chargerAlertes();
    this.chargerNbAlertes();
  }

  ngAfterViewInit(): void {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  chargerProfil() {
    this.http.get<ProfilDecideur>(
      `${this.apiUrl}/api/users/decideurs/mon-profil`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: d => {
        this.nomDecideur.set(d.nom);
        this.prenomDecideur.set(d.prenom);
        this.idDecideur = d.idUtilisateur;
        this.telephoneDecideur.set(d.telephone || '');
        this.adresseDecideur.set(d.adresse || '');
        this.emailDecideur.set(d.email || '');
      },
      error: () => {}
    });
  }

  toggleProfilPopup() {
    this.showProfilPopup = !this.showProfilPopup;
    this.showFormProfil = false;
    this.profilAModifier = null;
  }

  ouvrirModifierProfil() {
    this.profilAModifier = {
      nom: this.nomDecideur(),
      prenom: this.prenomDecideur(),
      telephone: this.telephoneDecideur(),
      email: this.emailDecideur(),
      adresse: this.adresseDecideur()
    };
    this.showFormProfil = true;
  }

  modifierProfil() {
    console.log('Données envoyées:', this.profilAModifier);
    console.log('ID Decideur:', this.idDecideur);
    this.http.put(
      `${this.apiUrl}/api/users/decideurs/${this.idDecideur}`,
      this.profilAModifier,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.nomDecideur.set(this.profilAModifier.nom);
        this.prenomDecideur.set(this.profilAModifier.prenom);
        this.telephoneDecideur.set(this.profilAModifier.telephone);
        this.showFormProfil = false;
        this.showProfilPopup = false;
        this.profilAModifier = null;
      },
      error: () => {}
    });
  }

  chargerDonnees() {
    this.http.get<StockAlert>(`${this.apiUrl}/api/marche/stock-alert/oignon`, { headers: this.getHeaders() })
      .subscribe({ next: d => { this.stockAlert.set(d); }, error: () => {} });

    this.http.get<CollecteDecideur[]>(`${this.apiUrl}/api/marche/collectes/derniers-prix`, { headers: this.getHeaders() })
      .subscribe({ next: d => this.collectes.set(Array.isArray(d) ? d : [d]), error: () => {} });

    this.http.get<RecoltDecideur[]>(`${this.apiUrl}/api/culture/recoltes/toutes`, { headers: this.getHeaders() })
      .subscribe({ next: d => this.recoltes.set(d), error: () => {} });

    this.http.get<{ [key: string]: number }>(`${this.apiUrl}/api/culture/recoltes/stats/par-region`, { headers: this.getHeaders() })
      .subscribe({ next: d => { this.statsParRegion.set(d); }, error: () => {} });

    this.http.get<Prevision>(`${this.apiUrl}/api/culture/previsions/oignon`, { headers: this.getHeaders() })
      .subscribe({
        next: d => {
          this.prevision.set(d);
          if (this.mapProduction) {
            this.mapProduction.eachLayer((layer: any) => {
              if (layer.setStyle) {
                const nom = layer.feature?.properties?.name || '';
                layer.setStyle({
                  fillColor: this.getCouleurRegion(nom),
                  fillOpacity: 0.65
                });
              }
            });
          }
        },
        error: () => {}
      });

    this.http.get<Marche[]>(`${this.apiUrl}/api/marche/marches`, { headers: this.getHeaders() })
      .subscribe({ next: d => this.marches.set(d), error: () => {} });

    this.http.get<Enqueteur[]>(`${this.apiUrl}/api/users/enqueteurs`, { headers: this.getHeaders() })
      .subscribe({ next: d => this.enqueteurs.set(d), error: () => {} });
  }

  initialiserCarteProduction() {
    if (this.mapProduction) {
      this.mapProduction.remove();
      this.mapProduction = null;
    }
    if (typeof window === 'undefined') return;

    const el = document.getElementById('map-production');
    if (!el) return;
    el.style.height = '420px';

    this.mapProduction = L.map('map-production', {
      center: [14.4974, -14.4524],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 10,
      maxBounds: [[12.0, -17.8], [16.9, -11.2]],
      maxBoundsViscosity: 1.0
    });

    setTimeout(() => this.mapProduction.invalidateSize(), 100);

    fetch('assets/geojson/SEN.geo.json')
      .then(res => res.json())
      .then(data => {
        L.geoJSON(data, {
          style: (feature: any) => ({
            color: '#1b5e20',
            weight: 1.5,
            fillColor: this.getCouleurRegion(feature?.properties?.name || ''),
            fillOpacity: 0.65
          }),
          onEachFeature: (feature: any, layer: any) => {
            const nom = feature?.properties?.name || '';
            const prod = this.statsParRegion()[nom] || 0;
            const prev = this.prevision()?.productionParRegion?.[nom] || 0;
            layer.bindPopup(
              `<b style="color:#0a3d0a;font-size:13px">📍 ${nom}</b><br>` +
              (prod > 0
                ? `<span style="font-size:11px">🌾 Récolte réelle : <b>${(prod/1000).toFixed(1)} t</b></span>`
                : prev > 0
                  ? `<span style="font-size:11px">Prévision: <b>${prev.toFixed(1)} t</b></span>`
                  : `<span style="font-size:11px;color:#aaa">Pas de données</span>`)
            );
            layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.9 }));
            layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.65 }));

            const center = (layer as any).getBounds().getCenter();
            L.marker(center, {
              icon: L.divIcon({
                className: '',
                html: `<div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#0a3d0a;text-align:center;white-space:nowrap;text-shadow:1px 1px 2px rgba(255,255,255,0.9),-1px -1px 2px rgba(255,255,255,0.9);pointer-events:none;">${nom}</div>`,
                iconSize: [80, 20],
                iconAnchor: [40, 10]
              }),
              interactive: false
            }).addTo(this.mapProduction);
          }
        }).addTo(this.mapProduction);

        this.mapProduction.fitBounds([[12.2, -17.7], [16.7, -11.3]]);
        setTimeout(() => { this.mapProduction?.invalidateSize(true); }, 500);
      })
      .catch(err => console.error('Erreur GeoJSON:', err));
  }

  getCouleurRegion(nom: string): string {
    const val = this.statsParRegion()[nom] || 0;
    const prev = this.prevision()?.productionParRegion?.[nom] || 0;
    const max = this.getMaxRegion();

    if (val > 0 && prev > 0) {
      const diff = val - prev;
      if (diff >= 1) {
        const pct = val / max;
        if (pct >= 0.8) return '#1b5e20';
        if (pct >= 0.6) return '#2e7d32';
        if (pct >= 0.4) return '#388e3c';
        if (pct >= 0.2) return '#43a047';
        return '#81c784';
      }
      if (diff > -1 && diff < 1) return '#26a69a';
      if (diff <= -1) return '#ff8f00';
    }

    if (val > 0) {
      const pct = val / max;
      if (pct >= 0.8) return '#1b5e20';
      if (pct >= 0.6) return '#2e7d32';
      if (pct >= 0.4) return '#388e3c';
      if (pct >= 0.2) return '#43a047';
      return '#81c784';
    }

    if (prev > 0) return '#fff9c4';
    return '#e8f5e9';
  }

  // ── KPI ──────────────────────────────────────────
  getStockTotal(): string { const s = this.stockAlert(); return s ? s.stockTotalTonnes.toLocaleString() + ' t' : '—'; }
  getMoisCouverts(): string { const s = this.stockAlert(); return s ? s.moisCouverts.toFixed(1) + ' mois' : '—'; }
  getStockNiveau(): string { return this.stockAlert()?.niveau || '—'; }
  getStockNiveauClass(): string {
    const n = this.getStockNiveau();
    if (n === 'OK') return 'niveau-ok';
    if (n === 'ATTENTION') return 'niveau-warn';
    return 'niveau-danger';
  }
  getPrevisionTotale(): string { const p = this.prevision(); return p ? p.productionPrevueTonnes.toFixed(1) + ' t' : '—'; }
  getPrixMoyen(): string {
    const c = this.collectes();
    if (!c.length) return '—';
    return Math.round(c.reduce((s, x) => s + x.prixUnitaire, 0) / c.length).toLocaleString() + ' F/kg';
  }

  // ── NOTIFICATIONS ─────────────────────────────────
  getNotifications(): Notification[] {
    const notifs: Notification[] = [];
    const stock = this.stockAlert();
    const prev = this.prevision();
    if (stock) {
      if (stock.moisCouverts >= 3) {
        notifs.push({ type: 'warning', icon: 'fa-triangle-exclamation', titre: 'Excédent de stock', message: `Stock oignon : ${stock.stockTotalTonnes.toLocaleString()} t — couvre ${stock.moisCouverts.toFixed(1)} mois. Envisagez l'exportation.`, temps: "Aujourd'hui" });
      } else if (stock.moisCouverts < 1) {
        notifs.push({ type: 'danger', icon: 'fa-circle-exclamation', titre: 'Stock critique', message: `Stock insuffisant — ${stock.moisCouverts.toFixed(1)} mois de consommation. IMPORTATION URGENTE.`, temps: "Aujourd'hui" });
      } else {
        notifs.push({ type: 'success', icon: 'fa-check', titre: 'Stock suffisant', message: `Stock oignon : ${stock.stockTotalTonnes.toLocaleString()} t — couvre ${stock.moisCouverts.toFixed(1)} mois.`, temps: "Aujourd'hui" });
      }
    }
    if (prev) {
      const moisInsuffisants = Object.entries(prev.productionParMois).filter(([, v]) => (v as number) < 5);
      if (moisInsuffisants.length > 0) {
        notifs.push({ type: 'danger', icon: 'fa-robot', titre: 'Production insuffisante prévue', message: `Mois critiques : ${moisInsuffisants.map(([m]) => m).join(', ')}. Planifiez des importations.`, temps: "Modèle IA" });
      } else {
        notifs.push({ type: 'info', icon: 'fa-robot', titre: 'Prévision ML normale', message: `${prev.productionPrevueTonnes.toFixed(1)} t prévues sur ${prev.periodeRecolte}.`, temps: "Modèle IA" });
      }
    }
    return notifs;
  }

  // ── PRÉVISIONS ────────────────────────────────────
  getMoisPrevisions(): { mois: string; valeur: number; statut: string; classe: string; conseil: string }[] {
    const p = this.prevision();
    if (!p) return [];
    return Object.entries(p.productionParMois).map(([mois, val]) => {
      const valeur = val as number;
      let statut = '', classe = '', conseil = '';
      if (valeur >= 5) { statut = 'Suffisant'; classe = 'ok'; conseil = `À partir de ${mois}, ${valeur.toFixed(1)} t disponibles.`; }
      else if (valeur >= 2) { statut = 'Faible'; classe = 'warn'; conseil = `Faible production en ${mois} — surveiller les stocks.`; }
      else { statut = 'Insuffisant'; classe = 'danger'; conseil = `${mois} : ${valeur.toFixed(2)} t — planifiez des importations.`; }
      return { mois, valeur, statut, classe, conseil };
    });
  }

  getMaxPrevision(): number {
    const p = this.prevision();
    if (!p) return 1;
    return Math.max(...Object.values(p.productionParMois).map(v => v as number));
  }

  getPourcentageBarre(valeur: number): number {
    return Math.min((valeur / this.getMaxPrevision()) * 100, 100);
  }

  // ── RÉGIONS ───────────────────────────────────────
  getRegions(): { nom: string; quantite: number }[] {
    return Object.entries(this.statsParRegion()).map(([nom, quantite]) => ({ nom, quantite })).sort((a, b) => b.quantite - a.quantite);
  }
  getMaxRegion(): number { const r = this.getRegions(); return r.length ? r[0].quantite : 1; }

  // ── MARCHÉS CRUD ──────────────────────────────────
  ajouterMarche() {
    this.http.post<Marche>(`${this.apiUrl}/api/marche/marches`, this.nouveauMarche, { headers: this.getHeaders() })
      .subscribe({
        next: () => { this.showMessage('Marché ajouté !', 'success'); this.showFormMarche = false; this.resetFormMarche(); this.chargerDonnees(); },
        error: () => this.showMessage('Erreur ajout marché !', 'error')
      });
  }

  ouvrirModifierMarche(m: Marche) {
    this.marcheAModifier = { ...m };
    this.showFormModifierMarche = true;
    this.showFormMarche = false;
  }

  modifierMarche() {
    if (!this.marcheAModifier) return;
    this.http.put<Marche>(`${this.apiUrl}/api/marche/marches/${this.marcheAModifier.idMarche}`, this.marcheAModifier, { headers: this.getHeaders() })
      .subscribe({
        next: () => { this.showMessage('Marché modifié !', 'success'); this.showFormModifierMarche = false; this.marcheAModifier = null; this.chargerDonnees(); },
        error: () => this.showMessage('Erreur modification !', 'error')
      });
  }

  supprimerMarche(id: number) {
    if (!confirm('Supprimer ce marché ?')) return;
    this.http.delete(`${this.apiUrl}/api/marche/marches/${id}`, { headers: this.getHeaders() })
      .subscribe({
        next: () => { this.showMessage('Marché supprimé !', 'success'); this.chargerDonnees(); },
        error: () => this.showMessage('Erreur suppression !', 'error')
      });
  }

  resetFormMarche() { this.nouveauMarche = { nomMarche: '', lieu: '', type: '' }; }

  // ── ENQUÊTEURS CRUD ───────────────────────────────
  ajouterEnqueteur() {
    const payload = { ...this.nouvelEnqueteur };
    this.http.post<Enqueteur>(`${this.apiUrl}/api/users/enqueteurs`, payload, { headers: this.getHeaders() })
      .subscribe({
        next: () => { this.showMessage('Enquêteur ajouté !', 'success'); this.showFormEnqueteur = false; this.resetFormEnqueteur(); this.chargerDonnees(); },
        error: () => this.showMessage('Erreur ajout enquêteur !', 'error')
      });
  }

  ouvrirModifierEnqueteur(e: Enqueteur) {
    this.enqueteurAModifier = { ...e };
    this.showFormModifierEnqueteur = true;
    this.showFormEnqueteur = false;
  }

  modifierEnqueteur() {
    if (!this.enqueteurAModifier) return;
    this.http.put<Enqueteur>(`${this.apiUrl}/api/users/enqueteurs/${this.enqueteurAModifier.idUtilisateur}`, this.enqueteurAModifier, { headers: this.getHeaders() })
      .subscribe({
        next: () => { this.showMessage('Enquêteur modifié !', 'success'); this.showFormModifierEnqueteur = false; this.enqueteurAModifier = null; this.chargerDonnees(); },
        error: () => this.showMessage('Erreur modification !', 'error')
      });
  }

  supprimerEnqueteur(id: number) {
    if (!confirm('Supprimer cet enquêteur ?')) return;
    this.http.delete(`${this.apiUrl}/api/users/enqueteurs/${id}`, { headers: this.getHeaders() })
      .subscribe({
        next: () => { this.showMessage('Enquêteur supprimé !', 'success'); this.chargerDonnees(); },
        error: () => this.showMessage('Erreur suppression !', 'error')
      });
  }

  resetFormEnqueteur() {
    this.nouvelEnqueteur = { nom: '', prenom: '', email: '', telephone: '', organisation: '', zoneAffectation: '', adresse: '' };
  }

  changerOnglet(onglet: string) {
    if (this.ongletActif === 'production' && this.mapProduction) {
      this.mapProduction.remove();
      this.mapProduction = null;
    }
    this.ongletActif = onglet;
    if (onglet === 'production') {
      setTimeout(() => { this.initialiserCarteProduction(); }, 300);
    }
    if (onglet === 'alertes') {
      this.marquerToutesLues();
      setTimeout(() => this.chargerNbAlertes(), 500);
    }
  }

  showMessage(msg: string, type: string) {
    this.message = msg; this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getTotalProduction(): number {
    return this.recoltes().reduce((s, r) => s + r.quantiteRecolte, 0);
  }

  chargerDonneesGraphique() {
    this.http.get<any[]>(
      `${this.apiUrl}/api/marche/collectes/stats/mensuelles?produit=oignon`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: data => {
        const nomsMois = ['', 'Janv', 'Févr', 'Mars', 'Avr', 'Mai',
                          'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
        const resultats = Array.from({ length: 12 }, (_, i) => ({
          mois: nomsMois[i + 1], prixMoyen: 0, stockTotal: 0
        }));
        data.forEach(d => {
          resultats[d.moisNum - 1] = {
            mois: nomsMois[d.moisNum],
            prixMoyen: d.prixMoyen || 0,
            stockTotal: d.stockTotal || 0
          };
        });

        const labels = resultats.map(d => d.mois);
        const prix = resultats.map(d => d.prixMoyen);
        const stock = resultats.map(d => d.stockTotal);

        this.chartPrixOptions = {
          series: [{ name: 'Prix moyen (F/kg)', data: prix }],
          chart: { type: 'line', height: 220, toolbar: { show: false }, zoom: { enabled: false } },
          stroke: { curve: 'smooth', width: 1 },
          colors: ['#e65100'],
          dataLabels: { enabled: false },
          markers: { size: 0 },
          xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
          yaxis: { labels: { style: { fontSize: '11px' } } },
          grid: { borderColor: '#f0f0f0' },
          tooltip: { y: { formatter: (val: number) => val ? val + ' F/kg' : '' } }
        };

        this.chartStockOptions = {
          series: [{ name: 'Stock (t)', data: stock }],
          chart: { type: 'line', height: 220, toolbar: { show: false }, zoom: { enabled: false } },
          stroke: { curve: 'smooth', width: 1 },
          colors: ['#0a3d0a'],
          dataLabels: { enabled: false },
          markers: { size: 0 },
          xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
          yaxis: { labels: { style: { fontSize: '11px' } } },
          grid: { borderColor: '#f0f0f0' },
          tooltip: { y: { formatter: (val: number) => val ? val + ' t' : '' } }
        };
      },
      error: () => {}
    });
  }

  getMarchesAvecStock(): number {
    return this.collectes().filter(c => c.quantiteDisponible > 0).length;
  }

  chargerAlertes() {
    this.http.get<AlerteDecideur[]>(
      `${this.apiUrl}/api/marche/alertes/historique`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: d => this.alertes.set(d),
      error: () => {}
    });
  }

  chargerNbAlertes() {
    this.http.get<number>(
      `${this.apiUrl}/api/marche/alertes/count`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: d => this.nbAlertesNonLues.set(d),
      error: err => console.log('erreur count:', err)
    });
  }

  getNbNotifications(): number { return this.nbAlertesNonLues(); }

  marquerToutesLues() {
    this.http.put(
      `${this.apiUrl}/api/marche/alertes/lire-toutes`,
      {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.nbAlertesNonLues.set(0);
        this.chargerAlertes();
        this.chargerNbAlertes();
      },
      error: () => {}
    });
  }

  getTypeAlerte(alerte: AlerteDecideur): string {
    switch (alerte.niveau) {
      case 'EXCEDENT':
      case 'SURPLUS':
      case 'CONFORME': return 'success';
      case 'INFO':     return 'info';
      case 'VIGILANCE':
      case 'DEFICIT':  return 'warning';
      default:         return 'danger';
    }
  }

  getIconeAlerte(alerte: AlerteDecideur): string {
    switch (alerte.niveau) {
      case 'EXCEDENT':
      case 'SURPLUS':   return 'fa-arrow-up';
      case 'CONFORME':  return 'fa-check-circle';
      case 'INFO':      return 'fa-seedling';
      case 'VIGILANCE': return 'fa-exclamation-triangle';
      case 'DEFICIT':   return 'fa-exclamation-circle';
      default:          return 'fa-bell';
    }
  }

  logout() { this.authService.logout(); }
}
