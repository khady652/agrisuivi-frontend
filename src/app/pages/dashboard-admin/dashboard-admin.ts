import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';

@Component({
    selector: 'app-dashboard-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard-admin.html',
    styleUrl: './dashboard-admin.css'
})
export class DashboardAdmin implements OnInit {

    ongletActif = 'accueil';
    message = '';
    messageType = '';
    nomAdmin = '';
    prenomAdmin = '';
    today = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric',
        month: 'long', year: 'numeric'
    });

    utilisateurs = signal<any[]>([]);
    regions = signal<any[]>([]);
    departements = signal<any[]>([]);
    servicesRegionaux = signal<any[]>([]);
    servicesDepartementaux = signal<any[]>([]);
    cooperatives = signal<any[]>([]);

    utilisateursActifs = computed(() =>
        this.utilisateurs().filter(u => u.actif).length
    );
    derniersUtilisateurs = computed(() =>
        this.utilisateurs().slice(0, 5)
    );
    totalServices = computed(() =>
        this.servicesRegionaux().length + this.servicesDepartementaux().length
    );

    showModalUser = false;
    typeUtilisateur = 'ENQUETEUR_MARCHE';
    formUser: any = {
        nom: '', prenom: '', email: '', telephone: '', adresse: '',
        organisation: '', zoneAffectation: '', specialite: '',
        idServiceRegional: null, idServiceDepartementale: null,
        idCooperative: null, anneeExperience: null, niveauInstruction: ''
    };

    showModalCoop = false;
    formCoop: any = {
        nomCooperative: '', adresse: '',
        nombreMembres: null, dateCreation: ''
    };

    showModalEditUser = false;
    userEnEdition: any = null;

    showModalEditCoop = false;
    coopEnEdition: any = null;

    private apiUrl = 'http://localhost:8080';

    constructor(
        private http: HttpClient,
        private authService: Auth
    ) {}

    ngOnInit() {
        this.chargerTout();
        this.chargerMonProfil();
    }

    getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${this.authService.getToken()}`
        });
    }

    chargerTout() {
        this.chargerUtilisateurs();
        this.chargerRegions();
        this.chargerDepartements();
        this.chargerServicesRegionaux();
        this.chargerServicesDepartementaux();
        this.chargerCooperatives();
    }

    changerOnglet(onglet: string) {
        this.ongletActif = onglet;
    }

    chargerMonProfil() {
        this.http.get<any>(
            `${this.apiUrl}/api/users/administrateurs/mon-profil`,
            { headers: this.getHeaders() }
        ).subscribe({
            next: (data) => {
                this.nomAdmin = data.nom || '';
                this.prenomAdmin = data.prenom || '';
            },
            error: () => console.error('Erreur profil admin')
        });
    }

    chargerUtilisateurs() {
        this.http.get<any[]>(
            `${this.apiUrl}/api/users/admin/utilisateurs`,
            { headers: this.getHeaders() }
        ).subscribe({
            next: (data) => this.utilisateurs.set(data),
            error: () => this.showMessage('Erreur chargement utilisateurs !', 'error')
        });
    }

    chargerRegions() {
        this.http.get<any[]>(`${this.apiUrl}/api/geo/regions`,
            { headers: this.getHeaders() }
        ).subscribe({ next: (data) => this.regions.set(data) });
    }

    chargerDepartements() {
        this.http.get<any[]>(`${this.apiUrl}/api/geo/departements`,
            { headers: this.getHeaders() }
        ).subscribe({ next: (data) => this.departements.set(data) });
    }

    chargerServicesRegionaux() {
        this.http.get<any[]>(`${this.apiUrl}/api/geo/services-regionaux`,
            { headers: this.getHeaders() }
        ).subscribe({ next: (data) => this.servicesRegionaux.set(data) });
    }

    chargerServicesDepartementaux() {
        this.http.get<any[]>(`${this.apiUrl}/api/geo/services-departementaux`,
            { headers: this.getHeaders() }
        ).subscribe({ next: (data) => this.servicesDepartementaux.set(data) });
    }

    /* chargerCooperatives() {
        this.http.get<any[]>(`${this.apiUrl}/api/users/cooperatives`,
            { headers: this.getHeaders() }
        ).subscribe({ next: (data) => this.cooperatives.set(data) });
    } */
  chargerCooperatives() {
      this.http.get<any[]>(`${this.apiUrl}/api/users/cooperatives`,
          { headers: this.getHeaders() }
      ).subscribe({
          next: (data) => {
              console.log('Première coopérative:', data[0]); // ← voir les champs
              this.cooperatives.set(data);
          }
      });
  }

    // ── Activer / Désactiver ──────────────────────────────
    activerCompte(id: number) {
        this.http.patch(`${this.apiUrl}/api/users/admin/activer/${id}`, {},
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => { this.showMessage('Compte activé !', 'success'); this.chargerUtilisateurs(); },
            error: () => this.showMessage('Erreur activation !', 'error')
        });
    }

    desactiverCompte(id: number) {
        this.http.patch(`${this.apiUrl}/api/users/admin/desactiver/${id}`, {},
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => { this.showMessage('Compte désactivé !', 'success'); this.chargerUtilisateurs(); },
            error: () => this.showMessage('Erreur désactivation !', 'error')
        });
    }

    // ── Modals Utilisateur ────────────────────────────────
    ouvrirModalUser() { this.showModalUser = true; }
    fermerModalUser() { this.showModalUser = false; this.resetFormUser(); }

    resetFormUser() {
        this.formUser = {
            nom: '', prenom: '', email: '', telephone: '', adresse: '',
            organisation: '', zoneAffectation: '', specialite: '',
            idServiceRegional: null, idServiceDepartementale: null,
            idCooperative: null, anneeExperience: null, niveauInstruction: ''
        };
        this.typeUtilisateur = 'ENQUETEUR_MARCHE';
    }

    getUrlCreer(): string {
        const urls: any = {
            'ENQUETEUR_MARCHE': '/api/users/enqueteurs',
            'DIRECTEUR_DR': '/api/users/directeurs/dr',
            'DIRECTEUR_SDDR': '/api/users/directeurs/sddr',
            'CHEF_COOPERATIF': '/api/users/chefs-cooperatifs',
            'AGRICULTEUR': '/api/users/agriculteurs',
            'DECIDEUR_ARM': '/api/users/decideurs',
            'ADMINISTRATEUR': '/api/users/administrateurs'
        };
        return urls[this.typeUtilisateur];
    }

    /* creerUtilisateur() {
        if (!this.formUser.nom || !this.formUser.prenom) {
            this.showMessage('Nom et prénom obligatoires !', 'error');
            return;
        }
        const url = this.getUrlCreer();
        this.http.post(`${this.apiUrl}${url}`, this.formUser,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.showMessage('Utilisateur créé !', 'success');
                this.fermerModalUser();
                this.chargerUtilisateurs();
            },
            error: (err) => this.showMessage(err.error?.message || 'Erreur création !', 'error')
        });
    } */
/* creerUtilisateur() {
    if (!this.formUser.nom || !this.formUser.prenom) {
        this.showMessage('Nom et prénom obligatoires !', 'error');
        return;
    }

    // ✅ Nettoyer les valeurs undefined
    const payload = { ...this.formUser };
    if (!payload.idCooperative) payload.idCooperative = null;
    if (!payload.idServiceRegional) payload.idServiceRegional = null;
    if (!payload.idServiceDepartementale) payload.idServiceDepartementale = null;
    if (!payload.anneeExperience) payload.anneeExperience = null;

    console.log('Payload envoyé:', payload); // ✅ vérifier

    const url = this.getUrlCreer();
    this.http.post(
        `${this.apiUrl}${url}`,
        payload,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Utilisateur créé !', 'success');
            this.fermerModalUser();
            this.chargerUtilisateurs();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur création !', 'error'
        )
    });
} */
creerUtilisateur() {
    if (!this.formUser.nom || !this.formUser.prenom) {
        this.showMessage('Nom et prénom obligatoires !', 'error');
        return;
    }

    const payload = { ...this.formUser };

    // Conversion en number
    const toInt = (val: any) =>
        val && val !== 'undefined' && val !== '' && val !== 'null'
            ? Number(val) : null;

    payload.idCooperative = toInt(payload.idCooperative);
    payload.idServiceRegional = toInt(payload.idServiceRegional);
    payload.idServiceDepartementale = toInt(payload.idServiceDepartementale);
    payload.anneeExperience = toInt(payload.anneeExperience);

    // ✅ Validation APRÈS la création du payload
    if (this.typeUtilisateur === 'CHEF_COOPERATIF' && !payload.idCooperative) {
        this.showMessage('Veuillez sélectionner une coopérative !', 'error');
        return;
    }

    console.log('Payload envoyé:', payload);
    console.log('idCooperative avant envoi:', payload.idCooperative, typeof payload.idCooperative);

    const url = this.getUrlCreer();
    this.http.post(
        `${this.apiUrl}${url}`,
        payload,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Utilisateur créé !', 'success');
            this.fermerModalUser();
            this.chargerUtilisateurs();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur création !', 'error'
        )
    });
}

    ouvrirModalEditUser(u: any) {
        this.userEnEdition = { ...u };
        console.log('User en édition:', this.userEnEdition);
        this.showModalEditUser = true;

    }

    fermerModalEditUser() {
        this.showModalEditUser = false;
        this.userEnEdition = null;
    }

    getUrlModifier(role: string, id: number): string {
        const urls: any = {
            'ENQUETEUR_MARCHE': `/api/users/enqueteurs/${id}`,
            'DIRECTEUR_DR': `/api/users/directeurs/dr/${id}`,
            'DIRECTEUR_SDDR': `/api/users/directeurs/sddr/${id}`,
            'CHEF_COOPERATIF': `/api/users/chefs-cooperatifs/${id}`,
            'AGRICULTEUR': `/api/users/agriculteurs/${id}`,
            'DECIDEUR_ARM': `/api/users/decideurs/${id}`,
            'ADMINISTRATEUR': `/api/users/administrateurs/${id}`
        };
        return urls[role];
    }

    modifierUtilisateur() {
        if (!this.userEnEdition.nom || !this.userEnEdition.prenom) {
            this.showMessage('Nom et prénom obligatoires !', 'error');
            return;
        }
        const url = this.getUrlModifier(
            this.userEnEdition.role,
            this.userEnEdition.idUtilisateur
        );
        if (!url) {
            this.showMessage('Rôle inconnu !', 'error');
            return;
        }
        this.http.put(`${this.apiUrl}${url}`, this.userEnEdition,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.showMessage('Utilisateur modifié !', 'success');
                this.fermerModalEditUser();
                this.chargerUtilisateurs();
            },
            error: (err) => this.showMessage(err.error?.message || 'Erreur modification !', 'error')
        });
    }

    supprimerUtilisateur(id: number, role: string) {
        if (!confirm('Supprimer cet utilisateur ?')) return;
        const url = this.getUrlModifier(role, id);
        this.http.delete(`${this.apiUrl}${url}`,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.showMessage('Utilisateur supprimé !', 'success');
                this.chargerUtilisateurs();
            },
            error: () => this.showMessage('Erreur suppression !', 'error')
        });
    }

    // ── Modals Coopérative ────────────────────────────────
    ouvrirModalCoop() { this.showModalCoop = true; }
    fermerModalCoop() { this.showModalCoop = false; this.resetFormCoop(); }

    resetFormCoop() {
        this.formCoop = {
            nomCooperative: '', adresse: '',
            nombreMembres: null, dateCreation: ''
        };
    }

    creerCooperative() {
        if (!this.formCoop.nomCooperative) {
            this.showMessage('Nom coopérative obligatoire !', 'error');
            return;
        }
        this.http.post(`${this.apiUrl}/api/users/cooperatives`, this.formCoop,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.showMessage('Coopérative créée !', 'success');
                this.fermerModalCoop();
                this.chargerCooperatives();
            },
            error: (err) => this.showMessage(err.error?.message || 'Erreur création !', 'error')
        });
    }

    ouvrirModalEditCoop(c: any) {
        this.coopEnEdition = { ...c };
        this.showModalEditCoop = true;
    }

    fermerModalEditCoop() {
        this.showModalEditCoop = false;
        this.coopEnEdition = null;
    }

    /* modifierCooperative() {
        if (!this.coopEnEdition.nomCooperative) {
            this.showMessage('Nom obligatoire !', 'error');
            return;
        }
        this.http.put(
            `${this.apiUrl}/api/users/cooperatives/${this.coopEnEdition.idCooperative}`,
            this.coopEnEdition,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.showMessage('Coopérative modifiée !', 'success');
                this.fermerModalEditCoop();
                this.chargerCooperatives();
            },
            error: (err) => this.showMessage(err.error?.message || 'Erreur modification !', 'error')
        });
    }
 */
 modifierCooperative() {
     if (!this.coopEnEdition.nomCooperative) {
         this.showMessage('Nom obligatoire !', 'error');
         return;
     }
     this.http.put(
         `${this.apiUrl}/api/users/cooperatives/${this.coopEnEdition.idCooperation}`, // ← idCooperation
         this.coopEnEdition,
         { headers: this.getHeaders() }
     ).subscribe({
         next: () => {
             this.showMessage('Coopérative modifiée !', 'success');
             this.fermerModalEditCoop();
             this.chargerCooperatives();
         },
         error: (err) => this.showMessage(err.error?.message || 'Erreur modification !', 'error')
     });
 }
    supprimerCooperative(id: number) {
        if (!confirm('Supprimer cette coopérative ?')) return;
        this.http.delete(`${this.apiUrl}/api/users/cooperatives/${id}`,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.showMessage('Coopérative supprimée !', 'success');
                this.chargerCooperatives();
            },
            error: () => this.showMessage('Erreur suppression !', 'error')
        });
    }

    // ── Utilitaires ───────────────────────────────────────
    showMessage(msg: string, type: string) {
        this.message = msg;
        this.messageType = type;
        setTimeout(() => this.message = '', 3000);
    }

    getRoleLabel(role: string): string {
        const labels: any = {
            'ADMINISTRATEUR': 'Admin',
            'DECIDEUR_ARM': 'Décideur ARM',
            'DIRECTEUR_SDDR': 'Dir. SDDR',
            'DIRECTEUR_DR': 'Dir. DR',
            'CHEF_COOPERATIF': 'Chef Coop.',
            'ENQUETEUR_MARCHE': 'Enquêteur',
            'AGRICULTEUR': 'Agriculteur'
        };
        return labels[role] || role;
    }

    getRoleBadge(role: string): string {
        const badges: any = {
            'ADMINISTRATEUR': 'badge-admin',
            'DECIDEUR_ARM': 'badge-decideur',
            'DIRECTEUR_SDDR': 'badge-directeur',
            'DIRECTEUR_DR': 'badge-directeur',
            'CHEF_COOPERATIF': 'badge-chef',
            'ENQUETEUR_MARCHE': 'badge-enqueteur',
            'AGRICULTEUR': 'badge-agriculteur'
        };
        return badges[role] || 'badge-default';
    }

    logout() { this.authService.logout(); }

    getPageTitle(): string {
        const titles: any = {
            'accueil': 'Tableau de bord',
            'utilisateurs': 'Gestion des utilisateurs',
            'regions': 'Gestion des régions',
            'departements': 'Gestion des départements',
            'services-reg': 'Services régionaux',
            'services-dep': 'Services départementaux',
            'cooperatives': 'Gestion des Coopératives'
        };
        return titles[this.ongletActif] || 'Dashboard';
    }
  searchUser = signal('');

  utilisateursFiltres = computed(() => {
      const q = this.searchUser().toLowerCase();
      if (!q) return this.utilisateurs();
      return this.utilisateurs().filter(u =>
          u.nom?.toLowerCase().includes(q) ||
          u.prenom?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
      );
  });

  /* getAvatarColor(nom: string): string {
      const colors = [
          '#1565c0', '#6a1b9a', '#0a3d0a',
          '#c62828', '#f57f17', '#00695c',
          '#4527a0', '#ad1457'
      ];
      const index = (nom?.charCodeAt(0) || 0) % colors.length;
      return colors[index];
  } */
  getAvatarColor(nom: string): string {
      return '#0a3d0a';
  }
  showModalVoir = false;
  userVu: any = null;

  ouvrirModalVoir(u: any) {
      this.userVu = { ...u };
      this.showModalVoir = true;
  }

  fermerModalVoir() {
      this.showModalVoir = false;
      this.userVu = null;
  }
exporterUtilisateurs() {
    const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Date création'];
    const rows = this.utilisateurs().map(u => [
        u.nom || '',
        u.prenom || '',
        u.email || '',
        u.telephone || '',
        this.getRoleLabel(u.role),
        u.actif ? 'Actif' : 'Inactif',
        u.dateCreation || ''
    ]);

    const csv = [headers, ...rows]
        .map(row => row.join(';'))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utilisateurs.csv';
    a.click();
    URL.revokeObjectURL(url);
}
// ── Modal région ──────────────────────────────────────
showModalRegion = false;
showModalEditRegion = false;
regionEnEdition: any = null;
formRegion: any = {
    nomRegion: '', population: null,
    superficie: null, latitude: null, longitude: null
};

ouvrirModalRegion() { this.showModalRegion = true; }
fermerModalRegion() { this.showModalRegion = false; this.resetFormRegion(); }

resetFormRegion() {
    this.formRegion = {
        nomRegion: '', population: null,
        superficie: null, latitude: null, longitude: null
    };
}

ouvrirModalEditRegion(r: any) {
    this.regionEnEdition = { ...r };
    this.showModalEditRegion = true;
}

fermerModalEditRegion() {
    this.showModalEditRegion = false;
    this.regionEnEdition = null;
}

creerRegion() {
    if (!this.formRegion.nomRegion) {
        this.showMessage('Nom région obligatoire !', 'error');
        return;
    }
    this.http.post(
        `${this.apiUrl}/api/geo/regions`,
        this.formRegion,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Région créée !', 'success');
            this.fermerModalRegion();
            this.chargerRegions();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur création !', 'error'
        )
    });
}

modifierRegion() {
    if (!this.regionEnEdition.nomRegion) {
        this.showMessage('Nom région obligatoire !', 'error');
        return;
    }
    this.http.put(
        `${this.apiUrl}/api/geo/regions/${this.regionEnEdition.idRegion}`,
        this.regionEnEdition,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Région modifiée !', 'success');
            this.fermerModalEditRegion();
            this.chargerRegions();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur modification !', 'error'
        )
    });
}

supprimerRegion(id: number) {
    if (!confirm('Supprimer cette région ?')) return;
    this.http.delete(
        `${this.apiUrl}/api/geo/regions/${id}`,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Région supprimée !', 'success');
            this.chargerRegions();
        },
        error: () => this.showMessage('Erreur suppression !', 'error')
    });
}

// ── Modal département ─────────────────────────────────
showModalDepartement = false;
showModalEditDepartement = false;
departementEnEdition: any = null;
formDepartement: any = {
    nomDepartement: '', population: null,
    superficie: null, latitude: null,
    longitude: null, idRegion: null
};

ouvrirModalDepartement() { this.showModalDepartement = true; }
fermerModalDepartement() { this.showModalDepartement = false; this.resetFormDepartement(); }

resetFormDepartement() {
    this.formDepartement = {
        nomDepartement: '', population: null,
        superficie: null, latitude: null,
        longitude: null, idRegion: null
    };
}

ouvrirModalEditDepartement(d: any) {
    this.departementEnEdition = { ...d };
    this.showModalEditDepartement = true;
}

fermerModalEditDepartement() {
    this.showModalEditDepartement = false;
    this.departementEnEdition = null;
}

creerDepartement() {
    if (!this.formDepartement.nomDepartement) {
        this.showMessage('Nom département obligatoire !', 'error');
        return;
    }
    this.http.post(
        `${this.apiUrl}/api/geo/departements`,
        this.formDepartement,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Département créé !', 'success');
            this.fermerModalDepartement();
            this.chargerDepartements();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur création !', 'error'
        )
    });
}

modifierDepartement() {
    if (!this.departementEnEdition.nomDepartement) {
        this.showMessage('Nom département obligatoire !', 'error');
        return;
    }
    this.http.put(
        `${this.apiUrl}/api/geo/departements/${this.departementEnEdition.idDepartement}`,
        this.departementEnEdition,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Département modifié !', 'success');
            this.fermerModalEditDepartement();
            this.chargerDepartements();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur modification !', 'error'
        )
    });
}

supprimerDepartement(id: number) {
    if (!confirm('Supprimer ce département ?')) return;
    this.http.delete(
        `${this.apiUrl}/api/geo/departements/${id}`,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Département supprimé !', 'success');
            this.chargerDepartements();
        },
        error: () => this.showMessage('Erreur suppression !', 'error')
    });
}

// ── Modal service régional ────────────────────────────
showModalServiceReg = false;
showModalEditServiceReg = false;
serviceRegEnEdition: any = null;
formServiceReg: any = {
    nomService: '', localite: '',
    telephoneService: '', emailService: '',
    idRegion: null
};

ouvrirModalServiceReg() { this.showModalServiceReg = true; }
fermerModalServiceReg() { this.showModalServiceReg = false; this.resetFormServiceReg(); }

resetFormServiceReg() {
    this.formServiceReg = {
        nomService: '', localite: '',
        telephoneService: '', emailService: '',
        idRegion: null
    };
}

ouvrirModalEditServiceReg(s: any) {
    this.serviceRegEnEdition = { ...s };
    this.showModalEditServiceReg = true;
}

fermerModalEditServiceReg() {
    this.showModalEditServiceReg = false;
    this.serviceRegEnEdition = null;
}

creerServiceReg() {
    if (!this.formServiceReg.nomService) {
        this.showMessage('Nom service obligatoire !', 'error');
        return;
    }
    this.http.post(
        `${this.apiUrl}/api/geo/services-regionaux`,
        this.formServiceReg,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Service régional créé !', 'success');
            this.fermerModalServiceReg();
            this.chargerServicesRegionaux();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur création !', 'error'
        )
    });
}

modifierServiceReg() {
    if (!this.serviceRegEnEdition.nomService) {
        this.showMessage('Nom service obligatoire !', 'error');
        return;
    }
    this.http.put(
        `${this.apiUrl}/api/geo/services-regionaux/${this.serviceRegEnEdition.idService}`,
        this.serviceRegEnEdition,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Service régional modifié !', 'success');
            this.fermerModalEditServiceReg();
            this.chargerServicesRegionaux();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur modification !', 'error'
        )
    });
}

supprimerServiceReg(id: number) {
    if (!confirm('Supprimer ce service régional ?')) return;
    this.http.delete(
        `${this.apiUrl}/api/geo/services-regionaux/${id}`,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Service régional supprimé !', 'success');
            this.chargerServicesRegionaux();
        },
        error: () => this.showMessage('Erreur suppression !', 'error')
    });
}
// ── Modal service départemental ───────────────────────
showModalServiceDep = false;
showModalEditServiceDep = false;
serviceDepEnEdition: any = null;
formServiceDep: any = {
    nomService: '', localite: '',
    telephoneService: '', emailService: '',
    idDepartement: null
};

ouvrirModalServiceDep() { this.showModalServiceDep = true; }
fermerModalServiceDep() { this.showModalServiceDep = false; this.resetFormServiceDep(); }

resetFormServiceDep() {
    this.formServiceDep = {
        nomService: '', localite: '',
        telephoneService: '', emailService: '',
        idDepartement: null
    };
}

ouvrirModalEditServiceDep(s: any) {
    this.serviceDepEnEdition = { ...s };
    this.showModalEditServiceDep = true;
}

fermerModalEditServiceDep() {
    this.showModalEditServiceDep = false;
    this.serviceDepEnEdition = null;
}

creerServiceDep() {
    if (!this.formServiceDep.nomService) {
        this.showMessage('Nom service obligatoire !', 'error');
        return;
    }
    this.http.post(
        `${this.apiUrl}/api/geo/services-departementaux`,
        this.formServiceDep,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Service départemental créé !', 'success');
            this.fermerModalServiceDep();
            this.chargerServicesDepartementaux();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur création !', 'error'
        )
    });
}

modifierServiceDep() {
    if (!this.serviceDepEnEdition.nomService) {
        this.showMessage('Nom service obligatoire !', 'error');
        return;
    }
    this.http.put(
        `${this.apiUrl}/api/geo/services-departementaux/${this.serviceDepEnEdition.idService}`,
        this.serviceDepEnEdition,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Service départemental modifié !', 'success');
            this.fermerModalEditServiceDep();
            this.chargerServicesDepartementaux();
        },
        error: (err) => this.showMessage(
            err.error?.message || 'Erreur modification !', 'error'
        )
    });
}

supprimerServiceDep(id: number) {
    if (!confirm('Supprimer ce service départemental ?')) return;
    this.http.delete(
        `${this.apiUrl}/api/geo/services-departementaux/${id}`,
        { headers: this.getHeaders() }
    ).subscribe({
        next: () => {
            this.showMessage('Service départemental supprimé !', 'success');
            this.chargerServicesDepartementaux();
        },
        error: () => this.showMessage('Erreur suppression !', 'error')
    });
}
logCoop(val: any) {
    console.log('idCooperative sélectionné:', val);
}
onCooperativeChange(val: string) {
    this.formUser.idCooperative = val && val !== '0' ? parseInt(val, 10) : null;
    console.log('Cooperative changée:', this.formUser.idCooperative);
}
}
