import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

// --- HOME ---
import { HomeComponent } from './features/home/home/home';

// --- AUTH ---
import { LoginComponent } from './features/auth/login/login';
import { UpdatePasswordComponent } from './features/auth/update-password/update-password';
import { TerminosComponent } from './features/terminos/terminos';

// --- ADMIN IMPORTS ---
import { AdminLayoutComponent } from './features/users/admin/admin-layout/admin-layout';
import { AdminDashboardComponent } from './features/users/admin/admin-dashboard/admin-dashboard';
import { AdminUsersComponent } from './features/users/admin/admin-users/admin-users';
import { AdminGroupsComponent } from './features/users/admin/admin-groups/admin-groups';
import { AdminClassesComponent } from './features/users/admin/admin-classes/admin-classes';
import { AdminEvaluationsComponent } from './features/users/admin/admin-evaluations/admin-evaluations';
import { AdminKineComponent } from './features/users/admin/admin-kine/admin-kine'; 
import { AdminNutriComponent } from './features/users/admin/admin-nutri/admin-nutri'; 
import { AdminPaymentsComponent } from './features/users/admin/admin-payments/admin-payments';
import { AdminGuidesManagementComponent } from './features/users/admin/admin-guides-management/admin-guides-management';
import { AdminAttendanceComponent } from './features/users/admin/admin-attendance/admin-attendance';
import { AdminHomeConfigComponent } from './features/users/admin/admin-home-config/admin-home-config';

// --- STUDENT IMPORTS (Portal Alumno) ---
import { StudentLayoutComponent } from './features/users/student/student-layout/student-layout';
import { StudentDashboardComponent } from './features/users/student/student-dashboard/student-dashboard';
import { StudentScheduleComponent } from './features/users/student/student-schedule/student-schedule';
import { StudentClassesComponent } from './features/users/student/student-classes/student-classes';
import { StudentAttendanceComponent } from './features/users/student/student-attendance/student-attendance';
import { StudentEvaluationsComponent } from './features/users/student/student-evaluations/student-evaluations';
import { StudentKineComponent } from './features/users/student/student-kine/student-kine';
import { StudentNutriComponent } from './features/users/student/student-nutri/student-nutri';
import { StudentViewGuidesComponent } from './features/users/student/student-view-guides/student-view-guides';
import { ViewTeachersComponent } from './features/users/student/view-teachers/view-teachers';

// --- PROFESSOR IMPORTS (Portal Profesor) ---
import { ProfessorLayoutComponent } from './features/users/professor/professor-layout/professor-layout';
import { ProfessorDashboardComponent } from './features/users/professor/professor-dashboard/professor-dashboard';
import { ProfessorAttendanceComponent } from './features/users/professor/professor-attendance/professor-attendance';
import { ProfessorClassesComponent } from './features/users/professor/professor-classes/professor-classes';
import { ProfessorEvaluationsComponent } from './features/users/professor/professor-evaluations/professor-evaluations';
import { ProfessorKinesiologyComponent } from './features/users/professor/professor-kinesiology/professor-kinesiology';
import { ProfessorNutritionComponent } from './features/users/professor/professor-nutrition/professor-nutrition';
import { ProfessorScheduleComponent } from './features/users/professor/professor-schedule/professor-schedule';
import { ProfessorViewGuidesComponent } from './features/users/professor/professor-view-guides/professor-view-guides';

// --- KINE IMPORTS ---
import { KineLayoutComponent } from './features/users/kine/kine-layout/kine-layout';
import { KineDashboardComponent } from './features/users/kine/kine-dashboard/kine-dashboard';
import { KineClassesComponent } from './features/users/kine/kine-classes/kine-classes';
import { KineEvaluationComponent } from './features/users/kine/kine-evaluation/kine-evaluation';
import { KineScheduleComponent } from './features/users/kine/kine-schedule/kine-schedule';
import { KineNutritionComponent } from './features/users/kine/kine-nutrition/kine-nutrition';
import { KineViewGuidesComponent } from './features/users/kine/kine-view-guides/kine-view-guides';
import { KineEvaluationsKineComponent } from './features/users/kine/kine-evaluations-kine/kine-evaluations-kine';
import { KineInjuryTrackingComponent } from './features/users/kine/kine-injury-tracking/kine-injury-tracking';
import { KinePatientsComponent } from './features/users/kine/kine-patients/kine-patients';
import { KineStudentProfileComponent } from './features/users/kine/kine-student-profile/kine-student-profile';

// --- NUTRI IMPORTS ---
import { NutriLayoutComponent } from './features/users/nutri/nutri-layout/nutri-layout';
import { NutriDashboardComponent } from './features/users/nutri/nutri-dashboard/nutri-dashboard';
import { NutriEvaluationsComponent } from './features/users/nutri/nutri-evaluation/nutri-evaluation';

export const routes: Routes = [
    // ==========================================
    // 0. RUTA HOME (Landing Page)
    // ==========================================
    { path: '', component: HomeComponent, pathMatch: 'full' }, 

    // ==========================================
    // 1. RUTAS AUTH (Login y Recuperación)
    // ==========================================
    { path: 'login', component: LoginComponent },
    { path: 'update-password', component: UpdatePasswordComponent },
    // ✅ 2. AGREGAMOS LA RUTA DE TÉRMINOS
    { path: 'terminos', component: TerminosComponent },

    // ==========================================
    // 2. RUTA ADMIN
    // ==========================================
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [authGuard],
        data: { roles: ['admin'] }, 
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
            { path: 'home-config', component: AdminHomeConfigComponent },
        ]
    },

    // ==========================================
    // 3. RUTA ESTUDIANTE
    // ==========================================
    {
        path: 'student',
        component: StudentLayoutComponent,
        canActivate: [authGuard], 
        data: { roles: ['student', 'estudiante'] },
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
    // 4. RUTA PROFESOR
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
    // 5. RUTA KINESIÓLOGO
    // ==========================================
    {
        path: 'kine',
        component: KineLayoutComponent,
        canActivate: [authGuard], 
        data: { roles: ['kine', 'kinesiologo'] },
        children: [
            { path: 'dashboard', component: KineDashboardComponent },
            { path: 'classes', component: KineClassesComponent },
            { path: 'evaluations', component: KineEvaluationComponent },
            { path: 'schedule', component: KineScheduleComponent },
            { path: 'nutrition', component: KineNutritionComponent },
            { path: 'guides', component: KineViewGuidesComponent },
            { path: 'injury-tracking', component: KineInjuryTrackingComponent },
            { path: 'patients', component: KinePatientsComponent },
            { path: 'student-profile', component: KineStudentProfileComponent },
            { path: 'evaluation-kine', component: KineEvaluationsKineComponent },

        ]
    },

    // ==========================================
    // 6. RUTA NUTRICIONISTA
    // ==========================================
    {
        path: 'nutri',
        component: NutriLayoutComponent,
        canActivate: [authGuard], 
        data: { roles: ['nutri', 'nutricionista'] },
        children: [
            { path: 'dashboard', component: NutriDashboardComponent },
            { path: 'evaluations', component: NutriEvaluationsComponent }
        ]
        
    },

    // ==========================================
    // Ruta comodín (404)
    // ==========================================
    { path: '**', redirectTo: '' } 
];