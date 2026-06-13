import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
import { AdminNutriComponent } from './features/users/admin/admin-nutri/admin-nutri'; 
import { AdminPaymentsComponent } from './features/users/admin/admin-payments/admin-payments';
import { AdminGuidesManagementComponent } from './features/users/admin/admin-guides-management/admin-guides-management';
import { AdminAttendanceComponent } from './features/users/admin/admin-attendance/admin-attendance';
import { AdminHomeConfigComponent } from './features/users/admin/admin-home-config/admin-home-config';
import { AdminKineEvolutionComponent } from './features/users/admin/admin-kine-evolution/admin-kine-evolution';
import { AdminKineEvaluationComponent } from './features/users/admin/admin-kine-evaluation/admin-kine-evaluation';
import { AdminKineLessionsComponent } from './features/users/admin/admin-kine-lessions/admin-kine-lessions';


// --- STUDENT IMPORTS (Portal Alumno) ---
import { StudentLayoutComponent } from './features/users/student/student-layout/student-layout';
import { StudentDashboardComponent } from './features/users/student/student-dashboard/student-dashboard';
import { StudentScheduleComponent } from './features/users/student/student-schedule/student-schedule';
import { StudentClassesComponent } from './features/users/student/student-classes/student-classes';
import { StudentAttendanceComponent } from './features/users/student/student-attendance/student-attendance';
import { StudentEvaluationsComponent } from './features/users/student/student-evaluations/student-evaluations';
import { StudentNutriComponent } from './features/users/student/student-nutri/student-nutri';
import { StudentViewGuidesComponent } from './features/users/student/student-view-guides/student-view-guides';
import { ViewTeachersComponent } from './features/users/student/view-teachers/view-teachers';
import { StudentKineEvolutionComponent } from './features/users/student/student-kine-evolution/student-kine-evolution';
import { StudentKineLessionsComponent } from './features/users/student/student-kine-lessions/student-kine-lessions';
import { StudentKineEvaluationComponent } from './features/users/student/student-kine-evaluation/student-kine-evaluation';



// --- PROFESSOR IMPORTS (Portal Profesor) ---
import { ProfessorLayoutComponent } from './features/users/professor/professor-layout/professor-layout';
import { ProfessorDashboardComponent } from './features/users/professor/professor-dashboard/professor-dashboard';
import { ProfessorAttendanceComponent } from './features/users/professor/professor-attendance/professor-attendance';
import { ProfessorClassesComponent } from './features/users/professor/professor-classes/professor-classes';
import { ProfessorEvaluationsComponent } from './features/users/professor/professor-evaluations/professor-evaluations';
import { ProfessorNutritionComponent } from './features/users/professor/professor-nutrition/professor-nutrition';
import { ProfessorScheduleComponent } from './features/users/professor/professor-schedule/professor-schedule';
import { ProfessorViewGuidesComponent } from './features/users/professor/professor-view-guides/professor-view-guides';
import { ProfessorViewStudentsComponent } from './features/users/professor/professor-view-students/professor-view-students';
import { ProfessorKineEvolutionComponent } from './features/users/professor/professor-kine-evolution/professor-kine-evolution';
import { ProfessorKineLessionsComponent } from './features/users/professor/professor-kine-lessions/professor-kine-lessions';
import { ProfessorKineEvaluationComponent } from './features/users/professor/professor-kine-evaluation/professor-kine-evaluation';


// --- KINE IMPORTS ---
import { KineLayoutComponent } from './features/users/kine/kine-layout/kine-layout';
import { KineDashboardComponent } from './features/users/kine/kine-dashboard/kine-dashboard';
import { KineClassesComponent } from './features/users/kine/kine-classes/kine-classes';
import { KineEvaluationComponent } from './features/users/kine/kine-evaluation/kine-evaluation';
import { KineScheduleComponent } from './features/users/kine/kine-schedule/kine-schedule';
import { KineNutritionComponent } from './features/users/kine/kine-nutrition/kine-nutrition';
import { KineViewGuidesComponent } from './features/users/kine/kine-view-guides/kine-view-guides';
import { KineEvaluationsKineComponent } from './features/users/kine/kine-evaluations-kine/kine-evaluations-kine';
import { KinePatientsComponent } from './features/users/kine/kine-patients/kine-patients';
import { KineEvolutionRecordComponent } from './features/users/kine/kine-evolution-record/kine-evolution-record';
import {KineInjuriesComponent} from './features/users/kine/kine-injuries/kine-injuries'

// --- NUTRI IMPORTS ---
import { NutriLayoutComponent } from './features/users/nutri/nutri-layout/nutri-layout';
import { NutriDashboardComponent } from './features/users/nutri/nutri-dashboard/nutri-dashboard';
import { NutriEvaluationsComponent } from './features/users/nutri/nutri-evaluation/nutri-evaluation';
import { NutriGuidesComponent } from './features/users/nutri/nutri-guides/nutri-guides';

export const routes: Routes = [
    // ==========================================
    // 0. RUTA HOME (Landing Page)
    // ==========================================
    { path: '', component: HomeComponent, pathMatch: 'full' }, 

    // ==========================================
    // 1. RUTAS AUTH (Login y Recuperación)
    // ==========================================
    { path: 'login', component: LoginComponent },
    { 
      path: 'update-password', 
      component: UpdatePasswordComponent,
      canActivate: [authGuard],
      data: { roles: ['all'] } // 🔥 AÑADIMOS ESTO PARA QUE EL GUARD DEJE PASAR A CUALQUIERA
    },
    { 
      path: 'terminos', 
      component: TerminosComponent,
      canActivate: [authGuard],
      data: { roles: ['all'] } // 🔥 AÑADIMOS ESTO TAMBIÉN AQUÍ
    },

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
            { path: 'nutri', component: AdminNutriComponent },
            { path: 'payments', component: AdminPaymentsComponent },
            { path: 'guides', component: AdminGuidesManagementComponent },
            { path: 'attendance', component: AdminAttendanceComponent },
            { path: 'home-config', component: AdminHomeConfigComponent },
            { path: 'kine-evaluation', component: AdminKineEvaluationComponent },
            { path: 'kine-evolution', component: AdminKineEvolutionComponent },
            { path: 'kine-lessions', component: AdminKineLessionsComponent },

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
            { path: 'nutri', component: StudentNutriComponent },
            { path: 'view-professor', component: ViewTeachersComponent },
            { path: 'guides', component: StudentViewGuidesComponent },
            { path: 'kine-evaluation', component: StudentKineEvaluationComponent },
            { path: 'kine-evolution', component: StudentKineEvolutionComponent },
            { path: 'kine-lessions', component: StudentKineLessionsComponent },
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
            { path: 'nutrition', component: ProfessorNutritionComponent },
            { path: 'schedule', component: ProfessorScheduleComponent },
            { path: 'guides', component: ProfessorViewGuidesComponent },
            { path: 'students', component: ProfessorViewStudentsComponent },
            { path: 'kine-evaluation', component: ProfessorKineEvaluationComponent },
            { path: 'kine-evolution', component: ProfessorKineEvolutionComponent },
            { path: 'kine-lessions', component: ProfessorKineLessionsComponent },
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
            { path: 'patients', component: KinePatientsComponent },
            { path: 'evaluation-kine', component: KineEvaluationsKineComponent },
            { path: 'evolution-record-kine', component: KineEvolutionRecordComponent },
            { path: 'injuries-kine', component: KineInjuriesComponent },
        
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
            { path: 'evaluations', component: NutriEvaluationsComponent },
            { path: 'guides', component: NutriGuidesComponent}
        ]
        
    },

    // ==========================================
    // Ruta comodín (404)
    // ==========================================
    { path: '**', redirectTo: '' } 
];