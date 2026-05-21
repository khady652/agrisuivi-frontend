import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Public } from '../../services/public';
import * as L from 'leaflet';

@Component({
    selector: 'app-accueil',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './accueil.html',
    styleUrl: './accueil.css'
})
export class Accueil implements OnInit, OnDestroy {

    prix: any[] = [];
    currentSlide = 0;
    private slideInterval: any;

    constructor(
        private router: Router,
        private publicService: Public
    ) {}

    ngOnInit() {
        this.startSlideshow();
        this.chargerPrix();
        this.navbarScroll();
        setTimeout(() => {
            console.log('Init carte...');
            this.initCarte();
        }, 1000);
    }

    ngOnDestroy() {
        clearInterval(this.slideInterval);
    }

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

    navbarScroll() {
        const nav = document.getElementById('nav');
        nav?.classList.add('solid');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) nav?.classList.add('solid');
            else nav?.classList.remove('solid');
        });
    }

    chargerPrix() {
        this.publicService.getPrixMarches().subscribe({
            next: (data: any[]) => {
                this.prix = data;
                setTimeout(() => this.updateTicker(), 100);
            },
            error: () => console.error('Erreur chargement prix')
        });
    }

    updateTicker() {
        const tick = document.getElementById('ticker');
        if (!tick || !this.prix.length) return;
        const items = [...this.prix, ...this.prix].map(p =>
            `<div class="tick-item">
                <div class="tdot"></div>
                <strong>${p.produit}</strong>
                <span class="tval">&nbsp;${new Intl.NumberFormat('fr-FR').format(p.prixUnitaire)} FCFA/kg</span>
                <span style="opacity:.45;font-size:12px">&nbsp;— ${p.nomMarche}</span>
             </div>`
        ).join('');
        tick.innerHTML = items;
    }

    allerLogin() {
        this.router.navigate(['/login']);
    }

    scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    formatNumber(n: number): string {
        return new Intl.NumberFormat('fr-FR').format(n);
    }

    formatDate(d: string): string {
        return new Date(d).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    }

    initCarte() {
        const el = document.getElementById('carte-leaflet');
        if (!el) {
            console.error('Element carte-leaflet introuvable !');
            return;
        }

        const map = L.map('carte-leaflet', {
            center: [14.4974, -14.4524],
            zoom: 7
        });

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            { attribution: '© OpenStreetMap' }
        ).addTo(map);

        this.publicService.getZonesProduction().subscribe({
            next: (geojson) => {
                console.log('GeoJSON reçu:', geojson);
                if (!geojson?.features?.length) {
                    console.warn('Aucune feature dans le GeoJSON');
                    return;
                }
                geojson.features.forEach((f: any) => {
                    const coords = f.geometry.coordinates;
                    const props = f.properties;
                    const production = props.production || 0;

                    const couleur = production > 10000 ? '#1b5e20'
                                  : production > 5000  ? '#2e7d32'
                                  : production > 0     ? '#66bb6a'
                                  : '#bdbdbd';

                    const rayon = production > 10000 ? 25
                                : production > 5000  ? 18
                                : production > 0     ? 12
                                : 8;

                    L.circleMarker(
                        [coords[1], coords[0]],
                        {
                            radius: rayon,
                            fillColor: couleur,
                            color: '#ffffff',
                            weight: 2,
                            fillOpacity: 0.85
                        }
                    )
                    .bindPopup(`
                        <div style="font-family:'Montserrat',sans-serif;min-width:180px">
                            <h3 style="color:#0a3d0a;margin:0 0 10px;font-size:16px">
                                📍 ${props.nomRegion}
                            </h3>
                            <p style="margin:5px 0;font-size:13px">
                                🌱 Production : <b>${new Intl.NumberFormat('fr-FR').format(production)} kg</b>
                            </p>
                            <p style="margin:5px 0;font-size:13px">
                                🌍 Surface : <b>${new Intl.NumberFormat('fr-FR').format(props.surfaceCultivee || 0)} m²</b>
                            </p>
                            <p style="margin:5px 0;font-size:13px">
                                👥 Population : <b>${new Intl.NumberFormat('fr-FR').format(props.population || 0)}</b>
                            </p>
                        </div>
                    `)
                    .bindTooltip(props.nomRegion, {
                        permanent: true,
                        direction: 'top',
                        className: 'region-tooltip'
                    })
                    .addTo(map);
                });

                setTimeout(() => map.invalidateSize(), 300);
            },
            error: (err) => console.error('Erreur carte:', err)
        });
    }
}
