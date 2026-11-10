import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FilaReporte {
  cursoId: number;
  curso: string;
  grupo: number;
  profesor: string;
  inscritos: number;
  asistenciaPromedio: number;
  alumnosEnRiesgo: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.scss']
})
export class ReportesComponent {
  filtroPeriodo: string = '2026-2';
  filtroCarrera: string = 'todos';
  tipoReporte: string = 'asistencia';

  reporteGenerado: boolean = false;
  cargando = signal<boolean>(false);
  aviso = signal<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  datosReporte: FilaReporte[] = [];

  generarReporte(): void {
    this.cargando.set(true);
    this.aviso.set(null);

    // Simulación de consulta al backend aplicando filtros (HU-14 CA1, CA2)[cite: 5]
    setTimeout(() => {
      this.cargando.set(false);
      this.reporteGenerado = true;

      // Datos simulados institucionales
      this.datosReporte = [
        { cursoId: 101, curso: 'Programación Web', grupo: 102, profesor: 'Mtra. Elizabeth Muñoz', inscritos: 28, asistenciaPromedio: 92, alumnosEnRiesgo: 1 },
        { cursoId: 102, curso: 'Bases de Datos', grupo: 103, profesor: 'Dr. Evelin Estrella', inscritos: 30, asistenciaPromedio: 85, alumnosEnRiesgo: 3 },
        { cursoId: 103, curso: 'Álgebra Lineal', grupo: 101, profesor: 'Ing. Carlos Mendoza', inscritos: 32, asistenciaPromedio: 78, alumnosEnRiesgo: 5 }
      ];

      this.aviso.set({ tipo: 'ok', texto: 'Reporte generado correctamente con los filtros seleccionados.' });
    }, 800);
  }

  exportar(formato: 'pdf' | 'excel'): void {
    // Implementación de descarga de reportes (HU-25)[cite: 5]
    alert(`Descargando reporte institucional en formato .${formato.toUpperCase()}...`);
  }
}
