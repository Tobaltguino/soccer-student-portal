import { Routes } from '@angular/router';

// --- SEGURIDAD ---
import { authGuard } from './core/auth/guards/auth.guard';
import { roleGuard } from './core/auth/guards/role.guard'; 
import { Rol } from './shared/enums/rol.enum';

// --- BASE ---
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/auth/login/login.component';
import { LayoutComponent } from './features/layout/layout.component'; 

// Las páginas se cargan bajo demanda (loadComponent): el bundle inicial solo trae
// home, login y layout; cada pantalla se descarga la primera vez que se visita.
// import { AdministradorPagosComponent } from './features/pages/administracion/pagos/pagos.component';

export const routes: Routes = [
    { path: '', component: HomeComponent, pathMatch: 'full' }, 

    { path: 'login', component: LoginComponent },
    { path: 'update-password', loadComponent: () => import('./features/auth/update-password/update-password.component').then(m => m.UpdatePasswordComponent) },
    { path: 'terminos', loadComponent: () => import('./features/terminos/terminos.component').then(m => m.TerminosComponent) },

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
                loadComponent: () => import('./features/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE, Rol.NUTRICIONISTA] }
            },
            
            // Horario: Kine, Profe, Estudiante
            { 
                path: 'horario', 
                loadComponent: () => import('./features/pages/academico/horario/horario.component').then(m => m.HorarioComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Clases: Admin, Kine, Profe, Estudiante
            { 
                path: 'clases', 
                loadComponent: () => import('./features/pages/academico/clases/clases.component').then(m => m.ClasesComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Asistencias: Admin, Kine, Profe, Estudiante
            { 
                path: 'asistencias', 
                loadComponent: () => import('./features/pages/academico/asistencias/asistencias.component').then(m => m.AsistenciasComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Evaluaciones Académicas/Deportivas: Admin, Kine, Profe, Estudiante
            { 
                path: 'evaluaciones', 
                loadComponent: () => import('./features/pages/academico/evaluaciones/evaluaciones.component').then(m => m.EvaluacionesComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Material: Todos
            { 
                path: 'material', 
                loadComponent: () => import('./features/pages/academico/material-complementario/material-complementario.component').then(m => m.MaterialComplementarioComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE, Rol.NUTRICIONISTA] }
            },

            // Cuerpo Técnico: Estudiante
            { 
                path: 'cuerpo-tecnico', 
                loadComponent: () => import('./features/pages/academico/cuerpo-tecnico/cuerpo-tecnico.component').then(m => m.CuerpoTecnicoComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ESTUDIANTE] }
            },

            // Estudiantes (Directorio): Profe, Kine
            { 
                path: 'estudiantes', 
                loadComponent: () => import('./features/pages/academico/ver-estudiantes/ver-estudiantes.component').then(m => m.VerEstudiantesComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.PROFESOR, Rol.KINESIOLOGO] }
            },
            
            // Evaluaciones Kine: Admin, Kine, Profe, Estudiante
            { 
                path: 'evaluaciones-kine', 
                loadComponent: () => import('./features/pages/salud/kinesiologia/evaluaciones/evaluaciones-kine.component').then(m => m.EvaluacionesKineComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Historial Clínico: Admin, Kine, Profe, Estudiante
            { 
                path: 'historial-clinico', 
                loadComponent: () => import('./features/pages/salud/kinesiologia/historial-clinico/historial-clinico.component').then(m => m.HistorialClinicoComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Fichas Evolutivas: Admin, Kine, Profe, Estudiante
            { 
                path: 'fichas-evolutivas', 
                loadComponent: () => import('./features/pages/salud/kinesiologia/ficha-evolutiva/ficha-evolutiva.component').then(m => m.FichaEvolutivaComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE] }
            },

            // Evaluaciones Nutri: Todos
            { 
                path: 'evaluaciones-nutri', 
                loadComponent: () => import('./features/pages/salud/nutricion/evaluaciones/nutri-evaluacion.component').then(m => m.NutriEvaluacionComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE, Rol.NUTRICIONISTA] }
            },

            // Administración de Usuarios: Admin
            { 
                path: 'usuarios', 
                loadComponent: () => import('./features/pages/administracion/usuarios/usuarios.component').then(m => m.UsuariosComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR] }
            },

            // Grupos: Admin
            { 
                path: 'grupos', 
                loadComponent: () => import('./features/pages/academico/grupos/grupos.component').then(m => m.AdministradorGruposComponent),
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
                loadComponent: () => import('./features/pages/administracion/web/web.component').then(m => m.WebComponent),
                canActivate: [roleGuard],
                data: { roles: [Rol.ADMINISTRADOR] }
            },
        ]
    },

    { path: '**', redirectTo: '' } 
];