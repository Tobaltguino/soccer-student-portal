import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard'; // Tu componente de Inicio
import { AdminUsersComponent } from './features/admin/admin-users/admin-users';
import { AdminGroupsComponent } from './features/admin/admin-groups/admin-groups';
import { AdminClassesComponent } from './features/admin/admin-classes/admin-classes';
import { AdminEvaluationsComponent } from './features/admin/admin-evaluations/admin-evaluations';
import { AdminKineComponent } from './features/admin/admin-kine/admin-kine';
import { AdminNutriComponent } from './features/admin/admin-nutri/admin-nutri';
import { AdminPaymentsComponent } from './features/admin/admin-payments/admin-payments';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },

    // RUTA PADRE (El Marco)
    {
        path: 'admin',
        component: AdminLayoutComponent, // Aquí se carga el Menú Lateral
   
        children: [
            { path: 'dashboard', component: AdminDashboardComponent },
            { path: 'users', component: AdminUsersComponent },
            { path: 'groups', component: AdminGroupsComponent },
            { path: 'classes', component: AdminClassesComponent },
            { path: 'evaluations', component: AdminEvaluationsComponent },
            { path: 'kinesiology', component: AdminKineComponent },
            { path: 'nutrition', component: AdminNutriComponent },
            { path: 'payments', component: AdminPaymentsComponent },
        ]
    }
];