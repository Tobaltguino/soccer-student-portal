import { Routes } from '@angular/router';

// --- NUEVOS IMPORTS DE SEGURIDAD ---
import { jwtGuard } from './core/auth/guards/jwt.guard';
import { roleGuard } from './core/auth/guards/role.guard';
import { Rol } from './shared/enums/rol.enum';

// --- HOME ---
import { HomeComponent } from './features/home/home/home.component';

// --- AUTH ---
import { LoginComponent } from './features/auth/login/login.component';
import { UpdatePasswordComponent } from './features/auth/update-password/update-password.component';
import { TerminosComponent } from './features/terminos/terminos';
// --- LAYOUT ---
import { LayoutComponent } from './features/layout/layout.component'; 

// ==========================================
// IMPORTS: ADMINISTRADOR
// ==========================================
import { AdministradorDashboardComponent } from './features/users/administrador/dashboard/dashboard.component';
import { AdministradorUsuariosComponent } from './features/users/administrador/usuarios/usuarios.component'; 
import { AdministradorGruposComponent } from './features/users/administrador/grupos/grupos.component';
import { AdministradorClasesComponent } from './features/users/administrador/clases/clases.component';
import { AdministradorEvaluacionesComponent } from './features/users/administrador/evaluaciones/evaluaciones.component';
import { AdministradorPagosComponent } from './features/users/administrador/pagos/pagos.component';
import { AdministradorMaterialComplementarioComponent } from './features/users/administrador/material-complementario/material-complementario.component';
import { AdministradorAsistenciasComponent } from './features/users/administrador/asistencias/asistencias.component';
import { AdminHomeConfigComponent } from './features/users/administrador/configuracion-inicio/configuracion-inicio.component';
// Módulos Salud (Admin)
import { AdministradorEvaluacionesKineComponent } from './features/users/administrador/evaluaciones-kine/evaluaciones-kine.component';
import { AdministradorHistorialClinicoComponent } from './features/users/administrador/historial-clinico/historial-clinico.component';
import { AdminKineEvolutionComponent } from './features/users/administrador/ficha-evolutiva/ficha-evolutiva.component';
import { AdminNutriComponent } from './features/users/administrador/nutricion/nutricion.component';

// ==========================================
// IMPORTS: ESTUDIANTE
// ==========================================
import { EstudianteDashboardComponent } from './features/users/estudiante/dashboard/dashboard.component';
import { EstudianteHorarioComponent } from './features/users/estudiante/horario/horario.component';
import { EstudianteClasesComponent } from './features/users/estudiante/clases/clases.component';
import { EstudianteAsistenciasComponent } from './features/users/estudiante/asistencias/asistencias.component';
import { EstudianteEvaluacionesComponent } from './features/users/estudiante/evaluaciones/evaluaciones.component';
import { EstudianteMaterialcomplementarioComponent } from './features/users/estudiante/material-complementario/material-complementario.component';
import { EstudianteCuerpoTecnicoComponent } from './features/users/estudiante/cuerpo-tecnico/cuerpo-tecnico.component';
// Módulos Salud (Estudiante)
import { StudentKineEvaluationComponent } from './features/users/estudiante/evaluaciones-kine/evaluaciones-kine.component';
import { EstudianteHistorialClinicoComponent } from './features/users/estudiante/historial-clinico/historial-clinico.component';
import { EstudianteFichaEvolutivaComponent } from './features/users/estudiante/ficha-evolutiva/ficha-evolutiva.component';
import { StudentNutriComponent } from './features/users/estudiante/nutricion/nutricion.component';

// ==========================================
// IMPORTS: PROFESOR
// ==========================================
import { ProfessorDashboardComponent } from './features/users/profesor/dashboard/dashboard.component';
import { ProfesorAsistenciasComponent } from './features/users/profesor/asistencias/asistencias.component';
import { ProfesorClasesComponent } from './features/users/profesor/clases/clases.component';
import { ProfesorEvaluacionesComponent } from './features/users/profesor/evaluaciones/evaluaciones.component';
import { ProfesorHorarioComponent } from './features/users/profesor/horario/horario.component';
import { ProfesorMaterialComplementarioComponent } from './features/users/profesor/material-complementario/material-complementario.component';
import { ProfesorVerEstudiantesComponent } from './features/users/profesor/ver-estudiantes/ver-estudiantes.component';
// Módulos Salud (Profesor)
import { ProfesorEvaluacionesKineComponent } from './features/users/profesor/evaluaciones-kine/evaluaciones-kine.component';
import { ProfesorHistorialClinicoComponent } from './features/users/profesor/historial-clinico/historial-clinico.component';
import { ProfesorFichaEvolutivaComponent } from './features/users/profesor/ficha-evolutiva/ficha-evolutiva.component';
import { ProfessorNutritionComponent } from './features/users/profesor/nutricion/nutricion.component';

// ==========================================
// IMPORTS: KINESIÓLOGO
// ==========================================
import { KinesiologoDashboardComponent } from './features/users/kinesiologo/dashboard/dashboard.component';
import { KinesiologoClasesComponent } from './features/users/kinesiologo/clases/clases.component';
import { KinesiologoHorarioComponent } from './features/users/kinesiologo/horario/horario.component';
import { KinesiollogoMaterialComplementarioComponent } from './features/users/kinesiologo/material-complementario/material-complementario.component';
import { KinesiolgoVerEstudiantesComponent } from './features/users/kinesiologo/ver-estudiantes/ver-estudiantes.component';
import { KinesiologoEvaluacionesComponent } from './features/users/kinesiologo/evaluaciones/evaluaciones.component'; // ✅ Import Añadido
// Módulos Salud (Kine)
import { KinesiologoEvaluacionesKineComponent } from './features/users/kinesiologo/evaluaciones-kine/evaluaciones-kine.component';
import { KinesiologoHistorialClinicoComponent } from './features/users/kinesiologo/historial-clinico/historial-clinico.component';
import { KinesiologoFichaEvolutivaComponent } from './features/users/kinesiologo/ficha-evolutiva/ficha-evolutiva.component';
import { KineNutritionComponent } from './features/users/kinesiologo/nutricion/nutricion.component';

// ==========================================
// IMPORTS: NUTRICIONISTA
// ==========================================
import { NutricionistaDashboardComponent } from './features/users/nutricionista/dashboard/dashboard.component';
import { NutricionistaMaterialComplementarioComponent } from './features/users/nutricionista/material-complementario/material-complementario.component';
import { NutriEvaluationsComponent } from './features/users/nutricionista/evaluacion-nutri/evaluaciones-nutri.component';

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
    { path: 'terminos', component: TerminosComponent },

    // ==========================================
    // 2. RUTA ADMIN
    // ==========================================
    {
        path: 'admin',
        component: LayoutComponent, 
        canActivate: [jwtGuard, roleGuard], 
        data: { roles: [Rol.ADMINISTRADOR] },      
        children: [
            { path: '', redirectTo: 'inicio', pathMatch: 'full' }, // ✅ Redirección base
            { path: 'inicio', component: AdministradorDashboardComponent },
            { path: 'usuarios', component: AdministradorUsuariosComponent },
            { path: 'grupos', component: AdministradorGruposComponent },
            { path: 'clases', component: AdministradorClasesComponent },
            { path: 'evaluaciones', component: AdministradorEvaluacionesComponent },
            { path: 'pagos', component: AdministradorPagosComponent },
            { path: 'material', component: AdministradorMaterialComplementarioComponent },
            { path: 'asistencias', component: AdministradorAsistenciasComponent },
            { path: 'configuracion', component: AdminHomeConfigComponent },
            // Salud Deportiva
            { path: 'evaluaciones-kine', component: AdministradorEvaluacionesKineComponent },
            { path: 'historial-clinico', component: AdministradorHistorialClinicoComponent },
            { path: 'fichas-evolutivas', component: AdminKineEvolutionComponent },
            { path: 'nutricion', component: AdminNutriComponent },
        ]
    },

    // ==========================================
    // 3. RUTA ESTUDIANTE
    // ==========================================
    {
        path: 'estudiante', // ✅ Convertido a español
        component: LayoutComponent, 
        canActivate: [jwtGuard, roleGuard], 
        data: { roles: [Rol.ESTUDIANTE] },
        children: [
            { path: '', redirectTo: 'inicio', pathMatch: 'full' },
            { path: 'inicio', component: EstudianteDashboardComponent },
            { path: 'horario', component: EstudianteHorarioComponent },
            { path: 'clases', component: EstudianteClasesComponent },
            { path: 'asistencias', component: EstudianteAsistenciasComponent },
            { path: 'evaluaciones', component: EstudianteEvaluacionesComponent },
            { path: 'cuerpo-tecnico', component: EstudianteCuerpoTecnicoComponent },
            { path: 'material', component: EstudianteMaterialcomplementarioComponent },
            // Salud Deportiva
            { path: 'evaluaciones-kine', component: StudentKineEvaluationComponent },
            { path: 'historial-clinico', component: EstudianteHistorialClinicoComponent },
            { path: 'fichas-evolutivas', component: EstudianteFichaEvolutivaComponent },
            { path: 'nutricion', component: StudentNutriComponent },
        ]
    },

    // ==========================================
    // 4. RUTA PROFESOR
    // ==========================================
    {
        path: 'profesor', // ✅ Convertido a español
        component: LayoutComponent, 
        canActivate: [jwtGuard, roleGuard], 
        data: { roles: [Rol.PROFESOR] },
        children: [
            { path: '', redirectTo: 'inicio', pathMatch: 'full' },
            { path: 'inicio', component: ProfessorDashboardComponent },
            { path: 'asistencias', component: ProfesorAsistenciasComponent },
            { path: 'clases', component: ProfesorClasesComponent },
            { path: 'evaluaciones', component: ProfesorEvaluacionesComponent },
            { path: 'horario', component: ProfesorHorarioComponent },
            { path: 'material', component: ProfesorMaterialComplementarioComponent },
            { path: 'estudiantes', component: ProfesorVerEstudiantesComponent },
            // Salud Deportiva
            { path: 'evaluaciones-kine', component: ProfesorEvaluacionesKineComponent },
            { path: 'historial-clinico', component: ProfesorHistorialClinicoComponent },
            { path: 'fichas-evolutivas', component: ProfesorFichaEvolutivaComponent },
            { path: 'nutricion', component: ProfessorNutritionComponent },
        ]
    },

    // ==========================================
    // 5. RUTA KINESIÓLOGO
    // ==========================================
    {
        path: 'kinesiologo', // ✅ Convertido a español
        component: LayoutComponent, 
        canActivate: [jwtGuard, roleGuard], 
        data: { roles: [Rol.KINESIOLOGO] },
        children: [
            { path: '', redirectTo: 'inicio', pathMatch: 'full' },
            { path: 'inicio', component: KinesiologoDashboardComponent },
            { path: 'clases', component: KinesiologoClasesComponent },
            { path: 'evaluaciones', component: KinesiologoEvaluacionesComponent }, // ✅ Ruta Añadida
            { path: 'horario', component: KinesiologoHorarioComponent },
            { path: 'material', component: KinesiollogoMaterialComplementarioComponent },
            { path: 'pacientes', component: KinesiolgoVerEstudiantesComponent },
            // Salud Deportiva
            { path: 'evaluaciones-kine', component: KinesiologoEvaluacionesKineComponent },
            { path: 'historial-clinico', component: KinesiologoHistorialClinicoComponent },
            { path: 'fichas-evolutivas', component: KinesiologoFichaEvolutivaComponent },
            { path: 'nutricion', component: KineNutritionComponent },
        ]
    },

    // ==========================================
    // 6. RUTA NUTRICIONISTA
    // ==========================================
    {
        path: 'nutricionista', // ✅ Convertido a español
        component: LayoutComponent, 
        canActivate: [jwtGuard, roleGuard], 
        data: { roles: [Rol.NUTRICIONISTA] },
        children: [
            { path: '', redirectTo: 'inicio', pathMatch: 'full' },
            { path: 'inicio', component: NutricionistaDashboardComponent },
            { path: 'evaluaciones', component: NutriEvaluationsComponent },
            { path: 'material', component: NutricionistaMaterialComplementarioComponent }
        ]
    },

    // ==========================================
    // Ruta comodín (404 / Fallback)
    // ==========================================
    { path: '**', redirectTo: '' } 
];