import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class Login implements OnInit, OnDestroy {

    email = '';
    password = '';
    loading = false;
    errorMessage = '';
    showPassword = false;
    currentSlide = 0;
    private slideInterval: any;

    constructor(
        private authService: Auth,
        private router: Router
    ) {}

    ngOnInit() {
        this.slideInterval = setInterval(() => {
            const slides = document.querySelectorAll('.login-slide');
            slides[this.currentSlide]?.classList.remove('active');
            this.currentSlide = (this.currentSlide + 1) % slides.length;
            slides[this.currentSlide]?.classList.add('active');
        }, 5000);
    }

    ngOnDestroy() {
        clearInterval(this.slideInterval);
    }

    login() {
        //console.log('Login appelé !', this.email, this.password); // ✅ ajouter
        if (!this.email || !this.password) {
            this.errorMessage = 'Veuillez remplir tous les champs !';
            return;
        }
        this.loading = true;
        this.errorMessage = '';
        //console.log('Envoi requête vers:', 'http://localhost:8080/api/auth/login'); // ✅ ajouter
        this.authService.login(this.email, this.password)
            .subscribe({
                next: (response) => {
                    console.log('Réponse reçue:', response); // ✅ ajouter
                    this.loading = false;
                    this.router.navigate([
                        this.authService.getDashboardRoute()
                    ]);
                },
                error: (err) => {
                    //console.error('Erreur login:', err); // ✅ ajouter
                    this.loading = false;
                    this.errorMessage = 'Email ou mot de passe incorrect !';
                }
            });
    }

    togglePassword() { this.showPassword = !this.showPassword; }

    retourAccueil() { this.router.navigate(['/']); }
}
