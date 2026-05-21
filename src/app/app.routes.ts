import { Routes } from '@angular/router';
import { Accueil } from './pages/accueil/accueil';
import { Login } from './pages/login/login';
import { DashboardDecideur } from './pages/dashboard-decideur/dashboard-decideur';
import { DashboardDirecteurSddr } from './pages/dashboard-directeur-sddr/dashboard-directeur-sddr';
import { DashboardDirecteurDr } from './pages/dashboard-directeur-dr/dashboard-directeur-dr';
import { DashboardChefCooperatif } from './pages/dashboard-chef-cooperatif/dashboard-chef-cooperatif';
import { DashboardAdmin } from './pages/dashboard-admin/dashboard-admin';
import { DashboardEnqueteur } from './pages/dashboard-enqueteur/dashboard-enqueteur';
import { DashboardAgriculteur } from './pages/dashboard-agriculteur/dashboard-agriculteur';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    { path: '', component: Accueil },
    { path: 'login', component: Login },
    {
        path: 'dashboard-decideur',
        component: DashboardDecideur,
        canActivate: [authGuard],
        data: { role: 'DECIDEUR_ARM' }
    },
    {
        path: 'dashboard-directeur-sddr',
        component: DashboardDirecteurSddr,
        canActivate: [authGuard],
        data: { role: 'DIRECTEUR_SDDR' }
    },
    {
        path: 'dashboard-directeur-dr',
        component: DashboardDirecteurDr,
        canActivate: [authGuard],
        data: { role: 'DIRECTEUR_DR' }
    },
    {
        path: 'dashboard-chef-cooperatif',
        component: DashboardChefCooperatif,
        canActivate: [authGuard],
        data: { role: 'CHEF_COOPERATIF' }
    },
    {
        path: 'dashboard-admin',
        component: DashboardAdmin,
        canActivate: [authGuard],
        data: { role: 'ADMINISTRATEUR' }
    },
    {
        path: 'dashboard-enqueteur',
        component: DashboardEnqueteur,
        canActivate: [authGuard],
        data: { role: 'ENQUETEUR_MARCHE' }
    },
    {
        path: 'dashboard-agriculteur',
        component: DashboardAgriculteur,
        canActivate: [authGuard],
        data: { role: 'AGRICULTEUR' }
    },
    { path: '**', redirectTo: '' }
];
