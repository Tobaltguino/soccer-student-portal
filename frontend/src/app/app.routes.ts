import { Routes } from '@angular/router';

// --- SEGURIDAD ---
import { authGuard } from './core/auth/guards/auth.guard';
import { roleGuard } from './core/auth/guards/role.guard'; 
import { Rol } from './shared/enums/rol.enum';

// --- BASE ---
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { UpdatePasswordComponent } from './features/auth/update-password/update-password.component';
import { TerminosComponent } from './features/terminos/terminos.component';
import { LayoutComponent } from './features/layout/layout.component'; 

// ==========================================
// IMPORTS: COMPONENTES UNIFICADOS
// ==========================================
import { DashboardComponent } from './features/pages/dashboard/dashboard.component';
import { HorarioComponent } from './features/pages/academico/horario/horario.component';
import { ClasesComponent } from './features/pages/academico/clases/clases.component';
import { AsistenciasComponent } from './features/pages/academico/asistencias/asistencias.component';
import { EvaluacionesComponent } from './features/pages/academico/evaluaciones/evaluaciones.component';
import { MaterialComplementarioComponent } from './features/pages/academico/material-complementario/material-complementario.component';
import { AdministradorGruposComponent } from './features/pages/academico/grupos/grupos.component';
import { CuerpoTecnicoComponent } from './features/pages/academico/cuerpo-tecnico/cuerpo-tecnico.component';
import { EvaluacionesKineComponent } from './features/pages/salud/kinesiologia/evaluaciones/evaluaciones-kine.component';
import { HistorialClinicoComponent } from './features/pages/salud/kinesiologia/historial-clinico/historial-clinico.component';
import { FichaEvolutivaComponent } from './features/pages/salud/kinesiologia/ficha-evolutiva/ficha-evolutiva.component';
import { NutriEvaluacionComponent } from './features/pages/salud/nutricion/evaluaciones/nutri-evaluacion.component';
import { VerEstudiantesComponent } from './features/pages/academico/ver-estudiantes/ver-estudiantes.component';
import { UsuariosComponent } from './features/pages/administracion/usuarios/usuarios.component';
// import { AdministradorPagosComponent } from './features/pages/administracion/pagos/pagos.component';
import { WebComponent } from './features/pages/administracion/web/web.component';

export const routes: Routes = [
    { path: '', component: HomeComponent, pathMatch: 'full' }, 

    { path: 'login', component: LoginComponent },
    { path: 'update-password', component: UpdatePasswordComponent },
    { path: 'terminos', component: TerminosComponent },

    // ==========================================
    // RUTAS PRIVADAS (CENTRALIZADAS Y PROTEGIDAS POR ROL)
    // ==========================================
    {
        path: '',
        component: LayoutComponent, 
        canActivate: [authGuard], // Verifica que esté logueado
        children: [
            // Dashboard: Todos
            { 
                path: 'inicio', 
                component: DashboardComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE, Rol.NUTRICIONISTA] }
            },
            
            // Horario: Kine, Profe, Estudiante
            { 
                path: 'horario', 
                component: HorarioComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Clases: Admin, Kine, Profe, Estudiante
            { 
                path: 'clases', 
                component: ClasesComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Asistencias: Admin, Kine, Profe, Estudiante
            { 
                path: 'asistencias', 
                component: AsistenciasComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Evaluaciones Académicas/Deportivas: Admin, Kine, Profe, Estudiante
            { 
                path: 'evaluaciones', 
                component: EvaluacionesComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Material: Todos
            { 
                path: 'material', 
                component: MaterialComplementarioComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE, Rol.NUTRICIONISTA] }
            },

            // Cuerpo Técnico: Estudiante
            { 
                path: 'cuerpo-tecnico', 
                component: CuerpoTecnicoComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ESTUDIANTE] }
            },

            // Estudiantes (Directorio): Profe, Kine
            { 
                path: 'estudiantes', 
                component: VerEstudiantesComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.PROFESOR, Rol.KINESIOLOGO] }
            },
            
            // Evaluaciones Kine: Admin, Kine, Profe, Estudiante
            { 
                path: 'evaluaciones-kine', 
                component: EvaluacionesKineComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Historial Clínico: Admin, Kine, Profe, Estudiante
            { 
                path: 'historial-clinico', 
                component: HistorialClinicoComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Fichas Evolutivas: Admin, Kine, Profe, Estudiante
            { 
                path: 'fichas-evolutivas', 
                component: FichaEvolutivaComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Evaluaciones Nutri: Todos
            { 
                path: 'evaluaciones-nutri', 
                component: NutriEvaluacionComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE, Rol.NUTRICIONISTA] }
            },

            // Administración de Usuarios: Admin
            { 
                path: 'usuarios', 
                component: UsuariosComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR] }
            },

            // Grupos: Admin
            { 
                path: 'grupos', 
                component: AdministradorGruposComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR] }
            },

            // Pagos: Admin (Comentado temporalmente)
            /*
            { 
                path: 'pagos', 
                component: AdministradorPagosComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR] }
            },
            */

            // Configuración Web: Admin
            { 
                path: 'configuracion', 
                component: WebComponent,
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR] }
            },
        ]
    },

    { path: '**', redirectTo: '' } 
];