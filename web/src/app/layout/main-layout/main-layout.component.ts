import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-gray-100">
      
      <aside class="w-64 bg-slate-900 text-white flex flex-col shadow-lg">
        <div class="p-6 text-center border-b border-slate-700">
          <h1 class="text-2xl font-bold text-blue-400">PROFUTBOL</h1>
          <p class="text-xs text-gray-400">Panel de Administración</p>
        </div>

        <nav class="flex-1 p-4 space-y-2">
          <a routerLink="/dashboard" 
             routerLinkActive="bg-blue-600 text-white"
             class="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-slate-800 transition cursor-pointer">
            <i class="pi pi-home"></i>
            <span>Inicio</span>
          </a>

          <a routerLink="/grupos" 
             routerLinkActive="bg-blue-600 text-white"
             class="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-slate-800 transition cursor-pointer">
            <i class="pi pi-users"></i>
            <span>Grupos</span>
          </a>

          <a routerLink="/fichas" 
             routerLinkActive="bg-blue-600 text-white"
             class="flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-slate-800 transition cursor-pointer">
            <i class="pi pi-heart"></i>
            <span>Salud (Kine)</span>
          </a>
        </nav>

        <div class="p-4 border-t border-slate-700">
          <button class="w-full flex items-center gap-2 text-red-400 hover:text-red-300">
            <i class="pi pi-sign-out"></i> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto p-8">
        <router-outlet></router-outlet>
      </main>

    </div>
  `
})
export class MainLayoutComponent {}