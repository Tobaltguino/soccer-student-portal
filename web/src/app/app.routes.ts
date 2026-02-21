import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard'; // ✅ IMPORTA EL GUARD AQUÍ

// --- AUTH ---
import { LoginComponent } from './features/auth/login/login';

// --- ADMIN IMPORTS ---
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users';
import { AdminGroupsComponent } from './features/admin/admin-groups/admin-groups';
import { AdminClassesComponent } from './features/admin/admin-classes/admin-classes';
import { AdminEvaluationsComponent } from './features/admin/admin-evaluations/admin-evaluations';
import { AdminKineComponent } from './features/admin/admin-kine/admin-kine'; 
import { AdminNutriComponent } from './features/admin/admin-nutri/admin-nutri'; 
import { AdminPaymentsComponent } from './features/admin/admin-payments/admin-payments';
import { AdminGuidesManagementComponent } from './features/admin/admin-guides-management/admin-guides-management';
import { AdminAttendanceComponent } from './features/admin/admin-attendance/admin-attendance';

// --- STUDENT IMPORTS (Portal Alumno) ---
import { StudentLayoutComponent } from './features/student/student-layout/student-layout';
import { StudentDashboardComponent } from './features/student/student-dashboard/student-dashboard';
import { StudentScheduleComponent } from './features/student/student-schedule/student-schedule';
import { StudentClassesComponent } from './features/student/student-classes/student-classes';
import { StudentAttendanceComponent } from './features/student/student-attendance/student-attendance';
import { StudentEvaluationsComponent } from './features/student/student-evaluations/student-evaluations';
import { StudentKineComponent } from './features/student/student-kine/student-kine';
import { StudentNutriComponent } from './features/student/student-nutri/student-nutri';
import { StudentViewGuidesComponent } from './features/student/student-view-guides/student-view-guides';
import { ViewTeachersComponent } from './features/student/view-teachers/view-teachers';

// --- PROFESSOR IMPORTS (Portal Profesor) ---
import { ProfessorLayoutComponent } from './features/professor/professor-layout/professor-layout';
import { ProfessorDashboardComponent } from './features/professor/professor-dashboard/professor-dashboard';
import { ProfessorAttendanceComponent } from './features/professor/professor-attendance/professor-attendance';
import { ProfessorClassesComponent } from './features/professor/professor-classes/professor-classes';
import { ProfessorEvaluationsComponent } from './features/professor/professor-evaluations/professor-evaluations';
import { ProfessorKinesiologyComponent } from './features/professor/professor-kinesiology/professor-kinesiology';
import { ProfessorNutritionComponent } from './features/professor/professor-nutrition/professor-nutrition';
import { ProfessorScheduleComponent } from './features/professor/professor-schedule/professor-schedule';
import { ProfessorViewGuidesComponent } from './features/professor/professor-view-guides/professor-view-guides';

// --- KINE IMPORTS ---
import { KineLayoutComponent } from './features/kine/kine-layout/kine-layout';
import { KineDashboardComponent } from './features/kine/kine-dashboard/kine-dashboard';

// --- NUTRI IMPORTS ---
import { NutriLayoutComponent } from './features/nutri/nutri-layout/nutri-layout';
import { NutriDashboardComponent } from './features/nutri/nutri-dashboard/nutri-dashboard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },

    // ==========================================
    // 1. RUTA ADMIN
    // ==========================================
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [authGuard], // ✅ Aplica el Guard
        data: { roles: ['admin'] }, // ✅ Define quién entra
        children: [
            { path: 'dashboard', component: AdminDashboardComponent },
            { path: 'users', component: AdminUsersComponent },
            { path: 'groups', component: AdminGroupsComponent },
            { path: 'classes', component: AdminClassesComponent },
            { path: 'evaluations', component: AdminEvaluationsComponent },
            { path: 'kinesiology', component: AdminKineComponent },
            { path: 'nutrition', component: AdminNutriComponent },
            { path: 'payments', component: AdminPaymentsComponent },
            { path: 'guides', component: AdminGuidesManagementComponent },
            { path: 'attendance', component: AdminAttendanceComponent },

        ]
    },

    // ==========================================
    // 2. RUTA ESTUDIANTE
    // ==========================================
    {
        path: 'student',
        component: StudentLayoutComponent,
        canActivate: [authGuard], 
        data: { roles: ['student', 'estudiante'] }, // ✅ Permite variables por si acaso
        children: [
            { path: 'dashboard', component: StudentDashboardComponent },
            { path: 'schedule', component: StudentScheduleComponent },
            { path: 'classes', component: StudentClassesComponent },
            { path: 'attendance', component: StudentAttendanceComponent },
            { path: 'evaluations', component: StudentEvaluationsComponent },
            { path: 'kine', component: StudentKineComponent },
            { path: 'nutri', component: StudentNutriComponent },
            { path: 'view-professor', component: ViewTeachersComponent },
            { path: 'guides', component: StudentViewGuidesComponent },
        ]
    },

    // ==========================================
    // 3. RUTA PROFESOR
    // ==========================================
    {
        path: 'professor',
        component: ProfessorLayoutComponent,
        canActivate: [authGuard], 
        data: { roles: ['professor', 'profesor'] },
        children: [
            { path: 'dashboard', component: ProfessorDashboardComponent },
            { path: 'attendance', component: ProfessorAttendanceComponent },
            { path: 'classes', component: ProfessorClassesComponent },
            { path: 'evaluations', component: ProfessorEvaluationsComponent },
            { path: 'kinesiology', component: ProfessorKinesiologyComponent },
            { path: 'nutrition', component: ProfessorNutritionComponent },
            { path: 'schedule', component: ProfessorScheduleComponent },
            { path: 'guides', component: ProfessorViewGuidesComponent },
        ]
    },

    // ==========================================
    // 4. RUTA KINESIÓLOGO
    // ==========================================
    {
        path: 'kine',
        component: KineLayoutComponent,
        canActivate: [authGuard], 
        data: { roles: ['kine', 'kinesiologo'] },
        children: [
            { path: 'dashboard', component: KineDashboardComponent },
        ]
    },

    // ==========================================
    // 5. RUTA NUTRICIONISTA
    // ==========================================
    {
        path: 'nutri',
        component: NutriLayoutComponent,
        canActivate: [authGuard], 
        data: { roles: ['nutri', 'nutricionista'] },
        children: [
            { path: 'dashboard', component: NutriDashboardComponent },
        ]
    },

    // Ruta comodín (404)
    { path: '**', redirectTo: 'login' }
];