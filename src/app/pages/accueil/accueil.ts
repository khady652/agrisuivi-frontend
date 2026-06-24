import { Component, OnInit, OnDestroy,NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Public } from '../../services/public';
import * as L from 'leaflet';
import { signal } from '@angular/core';

@Component({
    selector: 'app-accueil',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './accueil.html',
    styleUrl: './accueil.css'
})
export class Accueil implements OnInit, OnDestroy {

    //prix: any[] = [];
    //tickerItems: any[] = [];
    zonesProduction: any[] = [];
    currentSlide = 0;
    private slideInterval: any;
    private map: any = null;

    constructor(
       private router: Router,
           private publicService: Public,
           private ngZone: NgZone
    ) {}

    ngOnInit() {
        this.startSlideshow();
            this.chargerPrix();
            this.chargerZones();
            this.chargerStats();
            this.navbarScroll();
            //setTimeout(() => this.initCarte(), 1000);
    }

    ngOnDestroy() {
        clearInterval(this.slideInterval);
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
stats = signal<any>({ nbAgriculteurs: 0, nbEnqueteurs: 0, nbCooperatives: 0 });
nbMarches = signal<number>(0);

    // ── SLIDESHOW ─────────────────────────────────────────
    startSlideshow() {
        this.slideInterval = setInterval(() => {
            this.goSlide(this.currentSlide + 1);
        }, 5500);
    }

    goSlide(n: number) {
        const slides = document.querySelectorAll('.slide-bg');
        const dots = document.querySelectorAll('.ind');
        slides[this.currentSlide]?.classList.remove('active');
        dots[this.currentSlide]?.classList.remove('on');
        this.currentSlide = (n + slides.length) % slides.length;
        slides[this.currentSlide]?.classList.add('active');
        dots[this.currentSlide]?.classList.add('on');
    }
   chargerStats() {
       this.publicService.getStats().subscribe({
           next: (data: any) => this.stats.set(data),
           error: () => {}
       });

       this.publicService.getMarches().subscribe({
           next: (data: any[]) => this.nbMarches.set(data.length),
           error: () => {}
       });
   }
    // ── NAVBAR ────────────────────────────────────────────
    navbarScroll() {
        const nav = document.getElementById('nav');
        nav?.classList.add('solid');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) nav?.classList.add('solid');
            else nav?.classList.remove('solid');
        });
    }

    // ── PRIX MARCHÉS ──────────────────────────────────────
    prix = signal<any[]>([]);
    tickerItems = signal<any[]>([]);

    chargerPrix() {
        this.publicService.getPrixMarches().subscribe({
            next: (data: any[]) => {
                this.prix.set(data);
                this.tickerItems.set([...data, ...data]);
            },
            error: () => console.error('Erreur chargement prix')
        });
    }
    // ── ZONES PRODUCTION ──────────────────────────────────
    chargerZones() {
        this.publicService.getZonesProduction().subscribe({
            next: (geojson: any) => {
                this.zonesProduction = geojson.features || [];
                this.initCarte();
            },
            error: () => {}
        });
    }

    // ── NAVIGATION ────────────────────────────────────────
    allerLogin() {
        this.router.navigate(['/login']);
    }

    scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    scrollToCarte() {
        const el = document.getElementById('carte');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => this.initCarte(), 600);
        }
    }

    // ── FORMAT ────────────────────────────────────────────
    formatNumber(n: number): string {
        return new Intl.NumberFormat('fr-FR').format(n);
    }

    formatDate(d: string): string {
        return new Date(d).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    }

    // ── CARTE ─────────────────────────────────────────────
    initCarte() {
        if (this.map) {
            this.map.invalidateSize();
            return;
        }

        const el = document.getElementById('carte-leaflet');
        if (!el) {
            setTimeout(() => this.initCarte(), 500);
            return;
        }

        this.map = L.map('carte-leaflet', {
            center: [14.4974, -14.4524],
            zoom: 7,
            zoomControl: true,
            attributionControl: false,
            minZoom: 6,
            maxZoom: 10,
            maxBounds: [[12.0, -17.8], [16.9, -11.2]],
            maxBoundsViscosity: 1.0
        });

        setTimeout(() => this.map.invalidateSize(), 100);

        fetch('assets/geojson/SEN.geo.json')
            .then(res => res.json())
            .then(data => {
                L.geoJSON(data, {
                    style: (feature: any) => ({
                        color: '#1b5e20',
                        weight: 1.5,
                        fillColor: this.getCouleurRegion(
                            feature?.properties?.name || ''
                        ),
                        fillOpacity: 0.65
                    }),
                    onEachFeature: (feature: any, layer: any) => {
                        const nom = feature?.properties?.name || '';
                        const zone = this.zonesProduction
                            .find((z: any) => z.properties.nomRegion === nom);
                        const production = zone?.properties?.production || 0;

                        layer.bindPopup(`
                            <b style="color:#0a3d0a;font-size:13px">📍 ${nom}</b><br>
                            <span style="font-size:11px">
                                🌱 Production : <b>${new Intl.NumberFormat('fr-FR').format(production)} kg</b>
                            </span>
                        `);
                        layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.9 }));
                        layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.65 }));

                        const center = (layer as any).getBounds().getCenter();
                        L.marker(center, {
                            icon: L.divIcon({
                                className: '',
                                html: `<div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#0a3d0a;text-align:center;white-space:nowrap;text-shadow:1px 1px 2px rgba(255,255,255,0.9),-1px -1px 2px rgba(255,255,255,0.9);pointer-events:none;">${nom}</div>`,
                                iconSize: [80, 20],
                                iconAnchor: [40, 10]
                            }),
                            interactive: false
                        }).addTo(this.map);
                    }
                }).addTo(this.map);

                this.map.fitBounds([[12.2, -17.7], [16.7, -11.3]]);
                setTimeout(() => this.map.invalidateSize(), 300);
            })
            .catch(err => console.error('Erreur GeoJSON:', err));
    }

    // ── COULEUR RÉGION ────────────────────────────────────
    getCouleurRegion(nom: string): string {
        const zone = this.zonesProduction
            .find((z: any) => z.properties.nomRegion === nom);
        const production = zone?.properties?.production || 0;
        const max = Math.max(
            ...this.zonesProduction.map((z: any) => z.properties.production || 0),
            1
        );

        if (production === 0) return '#e8f5e9';
        const pct = production / max;
        if (pct >= 0.8) return '#1b5e20';
        if (pct >= 0.6) return '#2e7d32';
        if (pct >= 0.4) return '#388e3c';
        if (pct >= 0.2) return '#43a047';
        return '#81c784';
    }

}
