import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { AdminLayoutComponent } from './features/admin/layout/admin-layout/admin-layout';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard'; // Tu componente de Inicio
import { AdminUsersComponent } from './features/admin/users/admin-users/admin-users';
import { AdminGroupsComponent } from './features/admin/groups/admin-groups/admin-groups';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },

    // RUTA PADRE (El Marco)
    {
        path: 'admin',
        component: AdminLayoutComponent, // 👈 Aquí se carga el Menú Lateral
        // Ejemplo rápido de cómo quedaría tu app.routes.ts
        children: [
            { path: 'dashboard', component: AdminDashboardComponent },
            { path: 'users', component: AdminUsersComponent },
            { path: 'groups', component: AdminGroupsComponent },
            // pendientes
            //{ path: 'classes', component: AdminClassesComponent }, 
            //{ path: 'evaluations', component: AdminEvaluationsComponent },
            //{ path: 'kinesiology', component: AdminKinesiologyComponent },
            //{ path: 'nutrition', component: AdminNutritionComponent },
            //{ path: 'payments', component: AdminPaymentsComponent },
        ]
    }
];