import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ErrorMigracion {
  fila: number;
  dato: string;
  motivo: string;
}

interface ResultadoMigracion {
  exitosos: number;
  errores: ErrorMigracion[];
}

@Component({
  selector: 'app-migrar-kardex',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './migkardex.html',
  styleUrls: ['./migkardex.scss']
})
export class MigrarKardexComponent {
  archivoSeleccionado: File | null = null;
  cargando = signal<boolean>(false);
  aviso = signal<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);
  resultadoMigracion: ResultadoMigracion | null = null;

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      // Validación de tamaño máximo 10 MB (RNF-05)[cite: 12]
      if (file.size > 10 * 1024 * 1024) {
        this.aviso.set({ tipo: 'error', texto: 'El archivo supera el límite permitido de 10 MB.' });
        this.archivoSeleccionado = null;
        return;
      }
      this.archivoSeleccionado = file;
      this.aviso.set(null);
      this.resultadoMigracion = null;
    }
  }

  cancelarArchivo(): void {
    this.archivoSeleccionado = null;
    this.aviso.set(null);
    this.resultadoMigracion = null;
  }

  procesarMigracion(): void {
    if (!this.archivoSeleccionado) return;

    this.cargando.set(true);
    this.aviso.set(null);

    // Simulación del proceso de validación e importación al servidor (HU-30 CA1, CA2)[cite: 12]
    setTimeout(() => {
      this.cargando.set(false);

      // Datos simulados de respuesta del backend con reporte de errores por fila
      this.resultadoMigracion = {
        exitosos: 142,
        errores: [
          { fila: 15, dato: '20219999 - Cálculo II', motivo: 'Matrícula inexistente en la base de datos.' },
          { fila: 38, dato: '20210045 - Física I', motivo: 'Calificación fuera de escala permitida (11.0).' }
        ]
      };

      this.aviso.set({
        tipo: 'ok',
        texto: 'Proceso de migración finalizado. Revisa el reporte de filas rechazadas a continuación.'
      });
    }, 1500);
  }
}
