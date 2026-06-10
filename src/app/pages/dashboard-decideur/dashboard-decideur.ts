import { Component, OnInit, signal, AfterViewInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
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
  Marche
} from '../../models/decideur';


import * as L from 'leaflet';
@Component({
  selector: 'app-dashboard-decideur',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Formulaire marché
  showFormMarche = false;
  showFormModifierMarche = false;
  marcheAModifier: any = null;
  nouveauMarche = {
    nomMarche: '', lieuMarche: '', typeMarche: '', capaciteStockage: 0
  };

  // Formulaire enquêteur
  showFormEnqueteur = false;
  showFormModifierEnqueteur = false;
  enqueteurAModifier: any = null;
  nouvelEnqueteur = {
    nom: '', prenom: '', email: '', telephone: '',
    organisation: '', zoneAffectation: '', adresse: ''
  };

 /* private map: any = null;
  private markersLayer: any = null;
 */
 private mapProduction: any = null;
  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: Auth
  ) {}

  ngOnInit() {
    this.chargerProfil();
    this.chargerDonnees();
  }

  /* ngAfterViewInit() {
    //setTimeout(() => this.initialiserCarte(), 1000);
    this.initialiserCarte();
  } */
ngAfterViewInit(): void {
 // setTimeout(() => this.initialiserCarte(), 500);
}

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
      next: d => { this.nomDecideur.set(d.nom); this.prenomDecideur.set(d.prenom); },
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
          // Recharger les couleurs si la carte est déjà initialisée
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

  /* initialiserCarte() {
    console.log('initialiserCarte appelée');

    if (typeof window === 'undefined') return;

    const el = document.getElementById('map-decideur');
    console.log('Element map:', el);

    if (!el) {
      console.log('Element map-decideur introuvable !');
      return;
    }

    if (this.map) {
      console.log('Carte déjà initialisée');
      this.map.invalidateSize();
      return;
    }

    console.log('Création de la carte...');
    this.map = L.map('map-decideur', {
      center: [14.4974, -14.4524],
      zoom: 9,
      zoomControl: true,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 10,
      maxBounds: [[12.0, -17.8], [16.9, -11.2]],
      maxBoundsViscosity: 1.0
    });

     *//* L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    ).addTo(this.map); *//*
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
    this.markersLayer = L.layerGroup().addTo(this.map);
    console.log('Carte créée, chargement GeoJSON...');
     *//*const mapEl = document.getElementById('map-decideur');
    const mapParent = mapEl?.parentElement;
    if (mapParent && mapEl) {
      const headerH = mapParent.querySelector('.carte-header')?.clientHeight || 44;
      mapEl.style.height = (mapParent.clientHeight - headerH) + 'px';
    } *//*
fetch('assets/geojson/SEN.geo.json')
  .then(res => res.json())
  .then(data => {
    const geoLayer = L.geoJSON(data, {
      style: (feature: any) => ({
        color: '#1b5e20',
        weight: 1.5,
        fillColor: this.getCouleurRegion(feature?.properties?.name || ''),
        fillOpacity: 0.65
      }),
      onEachFeature: (feature: any, layer: any) => {
        const nom = feature?.properties?.name || '';
        const prod = this.statsParRegion()[nom] || 0;

        // ── Popup au clic ──
        layer.bindPopup(
          `<b style="color:#0a3d0a;font-size:13px">${nom}</b><br>` +
          (prod
            ? `<span style="font-size:11px">🌾 Production : <b>${(prod/1000).toFixed(1)} t</b></span>`
            : `<span style="font-size:11px;color:#aaa">Pas de données</span>`)
        );
        layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.9 }));
        layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.65 }));

        // ── Label nom région au centre ──
        const center = (layer as any).getBounds().getCenter();
        L.marker(center, {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              font-family:'Montserrat',sans-serif;
              font-size:10px;
              font-weight:700;
              color:#0a3d0a;
              text-align:center;
              white-space:nowrap;
              text-shadow:1px 1px 2px rgba(255,255,255,0.9),
                          -1px -1px 2px rgba(255,255,255,0.9);
              pointer-events:none;
            ">${nom}</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          }),
          interactive: false
        }).addTo(this.map);
      }
    }).addTo(this.map);

    //this.map.fitBounds([[12.2, -17.7], [16.7, -11.4]], { padding: [30, 60] });
    this.map.fitBounds([[12.0, -17.8], [16.9, -11.3]], { padding: [40, 40] });
    setTimeout(() => {
      this.map.invalidateSize();
      this.mettreAJourMarqueurs();
    }, 300);
  });
  } */
initialiserCarteProduction() {
  if (this.mapProduction) {
      this.mapProduction.remove();
      this.mapProduction = null;
    }
  if (typeof window === 'undefined') return;

  const el = document.getElementById('map-production');
  if (!el) return;
  el.style.height = '420px';
  if (this.mapProduction) {
    this.mapProduction.invalidateSize();
    return;
  }

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
          layer.bindPopup(
            `<b style="color:#0a3d0a;font-size:13px">${nom}</b><br>` +
            (prod
              ? `<span style="font-size:11px">🌾 Production : <b>${(prod/1000).toFixed(1)} t</b></span>`
              : `<span style="font-size:11px;color:#aaa">Pas de données</span>`)
          );
          layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.9 }));
          layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.65 }));

          const center = (layer as any).getBounds().getCenter();
         /*  // Décalage manuel pour les régions qui se chevauchent
          let latOffset = 0;
          let lngOffset = 0;
          if (nom === 'Fatick')  { latOffset = 0.3; lngOffset = -0.3; }
          if (nom === 'Kaolack') { latOffset = -0.3; lngOffset = 0.2; }
          if (nom === 'Thiès')   { latOffset = 0.1; lngOffset = -0.2; }
          if (nom === 'Dakar')   { latOffset = 0.1; lngOffset = -0.3; } */
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
      //setTimeout(() => this.mapProduction.invalidateSize(), 300);
      setTimeout(() => {
        this.mapProduction?.invalidateSize(true);
      }, 500);
    })
    .catch(err => console.error('Erreur GeoJSON:', err));
}
getCouleurRegion(nom: string): string {
  const val = this.statsParRegion()[nom] || 0;
  const prev = this.prevision()?.productionParRegion?.[nom] || 0;
  const max = this.getMaxRegion();

  // Récolte réelle ET prévision — comparaison
  if (val > 0 && prev > 0) {
    const diff = val - prev;

    if (diff >= 1) {
      // Récolte dépasse la prévision de +1t → vert foncé
      const pct = val / max;
      if (pct >= 0.8) return '#1b5e20';
      if (pct >= 0.6) return '#2e7d32';
      if (pct >= 0.4) return '#388e3c';
      if (pct >= 0.2) return '#43a047';
      return '#81c784';
    }

    if (diff > -1 && diff < 1) {
      // Récolte ≈ prévision (écart < 1t) → bleu-vert mélange
      return '#26a69a';
    }

    if (diff <= -1) {
      // Récolte en dessous de la prévision → orange
      return '#ff8f00';
    }
  }

  // Récolte réelle seulement → vert
  if (val > 0) {
    const pct = val / max;
    if (pct >= 0.8) return '#1b5e20';
    if (pct >= 0.6) return '#2e7d32';
    if (pct >= 0.4) return '#388e3c';
    if (pct >= 0.2) return '#43a047';
    return '#81c784';
  }

  // Prévision ML seulement → jaune
  if (prev > 0) return '#fff9c4';

  // Aucune donnée
  return '#e8f5e9';
}
 /* mettreAJourMarqueurs() {
   if (!this.map) return;
   if (!this.markersLayer) {
     this.markersLayer = L.layerGroup().addTo(this.map);
   }
   this.markersLayer.clearLayers();

   const stock = this.stockAlert();
   const stats = this.statsParRegion();
   const prev = this.prevision();

   const coords: { [key: string]: [number, number] } = {
     'Kaolack': [14.146, -16.072], 'Thiès': [14.783, -16.916],
     'Dakar': [14.693, -17.444], 'Saint-Louis': [16.017, -16.489],
     'Ziguinchor': [12.568, -16.271], 'Diourbel': [14.655, -16.232],
     'Fatick': [14.339, -16.411], 'Tambacounda': [13.770, -13.667]
   };

   Object.entries(stats).forEach(([region, val]) => {
     const quantite = val as number;
     const coord = coords[region];
     if (!coord) return;
     const icon = L.divIcon({
       className: '',
       html: `<div style="background:#1b5e20;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
       iconSize: [14, 14], iconAnchor: [7, 7]
     });
     L.marker(coord, { icon })
       .bindPopup(`<b style="color:#0a3d0a">${region}</b><br><span style="font-size:11px">Production réelle : ${(quantite / 1000).toFixed(1)} t</span>`)
       //.addTo(this.markersLayer);
     L.circle(coord, { color: '#1b5e20', fillColor: '#1b5e20', fillOpacity: 0.15, weight: 1.5, radius: 30000 })
       //.addTo(this.markersLayer);
   });

   if (prev?.productionParRegion) {
     Object.entries(prev.productionParRegion).forEach(([region, val]) => {
       const quantite = val as number;
       const coord = coords[region];
       if (!coord || stats[region]) return;
       const icon = L.divIcon({
         className: '',
         html: `<div style="background:#f9a825;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
         iconSize: [12, 12], iconAnchor: [6, 6]
       });
       L.marker(coord, { icon })
         .bindPopup(`<b style="color:#e65100">${region}</b><br><span style="font-size:11px">Prévision ML : ${quantite.toFixed(1)} t</span>`)
         //.addTo(this.markersLayer);
     });
   }

   if (stock && coords['Dakar']) {
     const icon = L.divIcon({
       className: '',
       html: `<div style="background:#1565c0;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
       iconSize: [12, 12], iconAnchor: [6, 6]
     });
     const c = this.collectes()[0];
     L.marker(coords['Dakar'], { icon })
       .bindPopup(`<b style="color:#1565c0">Marché Sandaga — Dakar</b><br><span style="font-size:11px">Stock : ${stock.stockTotalTonnes.toLocaleString()} t<br>Prix : ${c?.prixUnitaire || '—'} F/kg</span>`)
       //.addTo(this.markersLayer);
   }
 } */

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

  getNbNotifications(): number {
    return this.getNotifications().filter(n => n.type === 'danger' || n.type === 'warning').length;
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

  resetFormMarche() {
    this.nouveauMarche = { nomMarche: '', lieuMarche: '', typeMarche: '', capaciteStockage: 0 };
  }

  // ── ENQUÊTEURS CRUD ───────────────────────────────
  ajouterEnqueteur() {
    const payload = { ...this.nouvelEnqueteur, organisation: this.nouvelEnqueteur.organisation, zoneAffectation: this.nouvelEnqueteur.zoneAffectation };
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

  // ── NAVIGATION ────────────────────────────────────
  /* changerOnglet(onglet: string) {
    this.ongletActif = onglet;
    if (onglet === 'accueil') setTimeout(() => this.initialiserCarte(), 300);
  } */
/* changerOnglet(onglet: string) {
  this.ongletActif = onglet;
  if (onglet === 'accueil') {
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      } else {
        this.initialiserCarte();
      }
    }, 300);
  }
} */
/* changerOnglet(onglet: string) {
  this.ongletActif = onglet;
  if (onglet === 'production') {
    setTimeout(() => {
      if (this.mapProduction) {
        this.mapProduction.invalidateSize();
      } else {
        this.initialiserCarteProduction();
      }
    }, 400);
  }


} */
/* changerOnglet(onglet: string) {
  this.ongletActif = onglet;

  if (onglet === 'production') {
    setTimeout(() => {
      if (!this.mapProduction) {
        this.initialiserCarteProduction();
      }

      setTimeout(() => {
        this.mapProduction?.invalidateSize(true);
      }, 500);

    }, 100);
  }
} */
changerOnglet(onglet: string) {

  // Détruire la carte lorsqu'on quitte Production
  if (this.ongletActif === 'production' && this.mapProduction) {
    this.mapProduction.remove();
    this.mapProduction = null;
  }

  this.ongletActif = onglet;

  // Recréer la carte lorsqu'on revient sur Production
  if (onglet === 'production') {
    setTimeout(() => {
      this.initialiserCarteProduction();
    }, 300);
  }
}

  showMessage(msg: string, type: string) {
    this.message = msg; this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getTotalProduction(): number {
    return this.recoltes().reduce((s, r) => s + r.quantiteRecolte, 0);
  }

  logout() { this.authService.logout(); }
}
