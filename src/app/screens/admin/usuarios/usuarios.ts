import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  matricula: string;
  rol: 'alumno' | 'profesor' | 'administrador';
  activo: boolean;
}

@Component({
  selector: 'app-usuarios-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.scss']
})
export class UsuariosPermisosComponent {
  busqueda = signal<string>('');
  aviso = signal<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  // Lista simulada de usuarios institucionales (HU-12, HU-13)[cite: 5]
  usuarios = signal<Usuario[]>([
    { id: 1, nombre: 'Elizabeth', apellidos: 'Muñoz Astorga', correo: 'elizabeth.munoz@universidad.edu.mx', matricula: '202374730', rol: 'profesor', activo: true },
    { id: 2, nombre: 'Evelin Estrella', apellidos: 'Corona Matlacuatzi', correo: 'evelin.corona@universidad.edu.mx', matricula: '202374731', rol: 'profesor', activo: true },
    { id: 3, nombre: 'Carlos', apellidos: 'Mendoza', correo: 'carlos.mendoza@universidad.edu.mx', matricula: '20210045', rol: 'alumno', activo: true },
    { id: 4, nombre: 'Administrador', apellidos: 'General', correo: 'admin@universidad.edu.mx', matricula: 'ADM-01', rol: 'administrador', activo: true }
  ]);

  usuariosFiltrados = computed(() => {
    const query = this.busqueda().toLowerCase();
    if (!query) return this.usuarios();
    return this.usuarios().filter(u =>
      u.nombre.toLowerCase().includes(query) ||
      u.apellidos.toLowerCase().includes(query) ||
      u.correo.toLowerCase().includes(query) ||
      u.matricula.toLowerCase().includes(query)
    );
  });

  abrirModalNuevo(): void {
    this.aviso.set({ tipo: 'info', texto: 'Funcionalidad de formulario modal para alta de usuario institucional (HU-12 CA1)[cite: 5].' });
  }

  editarUsuario(u: Usuario): void {
    this.aviso.set({ tipo: 'info', texto: `Modificando datos y permisos para ${u.nombre} ${u.apellidos} (HU-13)[cite: 5].` });
  }

  toggleActivo(u: Usuario): void {
    this.usuarios.update(lista =>
      lista.map(item => item.id === u.id ? { ...item, activo: !item.activo } : item)
    );
    this.aviso.set({
      tipo: 'ok',
      texto: `La cuenta de ${u.nombre} ha sido ${!u.activo ? 'activada' : 'desactivada'}. Su historial académico se conserva (HU-12 CA3)[cite: 5].`
    });
  }
}
