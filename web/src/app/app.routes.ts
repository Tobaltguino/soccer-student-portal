import { Routes } from '@angular/router';

// --- AUTH ---
import { LoginComponent } from './features/auth/login/login';

// --- ADMIN IMPORTS ---
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users';
import { AdminGroupsComponent } from './features/admin/admin-groups/admin-groups';
import { AdminClassesComponent } from './features/admin/admin-classes/admin-classes';
import { AdminEvaluationsComponent } from './features/admin/admin-evaluations/admin-evaluations';
import { AdminKineComponent } from './features/admin/admin-kine/admin-kine'; // Vista Admin ("En construcción")
import { AdminNutriComponent } from './features/admin/admin-nutri/admin-nutri'; // Vista Admin ("En construcción")
import { AdminPaymentsComponent } from './features/admin/admin-payments/admin-payments';

// --- STUDENT IMPORTS (Portal Alumno) ---
import { StudentLayoutComponent } from './features/student/student-layout/student-layout';
import { StudentDashboardComponent } from './features/student/student-dashboard/student-dashboard';

// --- PROFESSOR IMPORTS (Portal Profesor) ---
import { ProfessorLayoutComponent } from './features/professor/professor-layout/professor-layout';
import { ProfessorDashboardComponent } from './features/professor/professor-dashboard/professor-dashboard';

// --- KINE IMPORTS (Portal Especialista Kinesiólogo) ---
import { KineLayoutComponent } from './features/kine/kine-layout/kine-layout';
import { KineDashboardComponent } from './features/kine/kine-dashboard/kine-dashboard';

// --- NUTRI IMPORTS (Portal Especialista Nutricionista) ---
import { NutriLayoutComponent } from './features/nutri/nutri-layout/nutri-layout';
import { NutriDashboardComponent } from './features/nutri/nutri-dashboard/nutri-dashboard';

export const routes: Routes = [
    // Redirección inicial
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },

    // ==========================================
    // 1. RUTA ADMIN (Administrador General)
    // ==========================================
    {
        path: 'admin',
        component: AdminLayoutComponent, // Menú lateral del Admin
        children: [
            { path: 'dashboard', component: AdminDashboardComponent },
            { path: 'users', component: AdminUsersComponent },
            { path: 'groups', component: AdminGroupsComponent },
            { path: 'classes', component: AdminClassesComponent },
            { path: 'evaluations', component: AdminEvaluationsComponent },
            { path: 'kinesiology', component: AdminKineComponent }, // Gestión Admin de Kine
            { path: 'nutrition', component: AdminNutriComponent },   // Gestión Admin de Nutri
            { path: 'payments', component: AdminPaymentsComponent },
        ]
    },

    // ==========================================
    // 2. RUTA ESTUDIANTE (Portal del Alumno)
    // ==========================================
    {
        path: 'student',
        component: StudentLayoutComponent, // Menú lateral del Estudiante
        children: [
            { path: 'dashboard', component: StudentDashboardComponent },
            // Aquí agregarás: { path: 'mis-clases', ... }, { path: 'mis-pagos', ... }
        ]
    },

    // ==========================================
    // 3. RUTA PROFESOR (Portal del Docente)
    // ==========================================
    {
        path: 'professor',
        component: ProfessorLayoutComponent, // Menú lateral del Profesor
        children: [
            { path: 'dashboard', component: ProfessorDashboardComponent },
            // Aquí agregarás: { path: 'asistencia', ... }, { path: 'planificacion', ... }
        ]
    },

    // ==========================================
    // 4. RUTA KINESIÓLOGO (Portal del Especialista)
    // ==========================================
    {
        path: 'kine',
        component: KineLayoutComponent, // Menú lateral del Kinesiólogo
        children: [
            { path: 'dashboard', component: KineDashboardComponent },
            // Aquí agregarás: { path: 'pacientes', ... }, { path: 'fichas', ... }
        ]
    },

    // ==========================================
    // 5. RUTA NUTRICIONISTA (Portal del Especialista)
    // ==========================================
    {
        path: 'nutri',
        component: NutriLayoutComponent, // Menú lateral del Nutricionista
        children: [
            { path: 'dashboard', component: NutriDashboardComponent },
            // Aquí agregarás: { path: 'dietas', ... }, { path: 'seguimiento', ... }
        ]
    },

    // Ruta comodín (404) -> redirigir al login
    { path: '**', redirectTo: 'login' }
];