import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Public } from '../../services/public';

@Component({
    selector: 'app-accueil',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './accueil.html',
    styleUrl: './accueil.css'
})
export class Accueil implements OnInit {

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
    }

    // ── Slideshow ─────────────────────────────────────────
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

    // ── Navbar scroll ─────────────────────────────────────
    navbarScroll() {
        const nav = document.getElementById('nav');
        nav?.classList.add('solid');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) nav?.classList.add('solid');
            else nav?.classList.remove('solid');
        });
    }

    // ── Charger prix ──────────────────────────────────────
    chargerPrix() {
        this.publicService.getPrixMarches().subscribe({
            next: (data) => {
                this.prix = data;
                this.updateTicker();
            },
            error: () => console.error('Erreur chargement prix')
        });
    }

    // ── Ticker ────────────────────────────────────────────
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

    ngOnDestroy() {
        clearInterval(this.slideInterval);
    }
}
