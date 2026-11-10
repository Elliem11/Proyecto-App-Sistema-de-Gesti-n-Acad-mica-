export type Role = 'admin' | 'profesor' | 'alumno';

export interface User {
  id: number;
  nombre: string;
  email: string;
  password: string;
  role: Role;
}

export type Session = Omit<User, 'password'>;
