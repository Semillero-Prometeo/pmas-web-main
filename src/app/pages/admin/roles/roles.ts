import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../components/navbar/navbar';
import { Footer } from '../../../components/footer/footer';
import { Sidebar } from '../../../components/sidebar/sidebar';

const GATEWAY_URL = 'http://localhost:3000';

export interface Role {
  id: number;
  name: string;
  description?: string;
  user_count?: number;
}

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-roles',
  imports: [Navbar, Footer, Sidebar, FormsModule],
  templateUrl: './roles.html',
})
export class Roles implements OnInit {
  private http = inject(HttpClient);

  roles = signal<Role[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  search = signal('');

  modalOpen = signal(false);
  modalMode = signal<ModalMode>('create');
  saving = signal(false);
  modalError = signal<string | null>(null);

  form = signal({ id: 0, name: '', description: '' });

  deleteTarget = signal<Role | null>(null);
  deleting = signal(false);

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<{ data: Role[] } | Role[]>(`${GATEWAY_URL}/roles?skip=0&take=10`).subscribe({
      next: (res: { data: Role[] } | Role[]) => {
        this.roles.set((res as { data: Role[] }).data ?? (res as Role[]) ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los roles.');
        this.loading.set(false);
      },
    });
  }

  filteredRoles() {
    const q = this.search().toLowerCase();
    if (!q) return this.roles();
    return this.roles().filter(r => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
  }

  openCreate() {
    this.form.set({ id: 0, name: '', description: '' });
    this.modalMode.set('create');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(role: Role) {
    this.form.set({ id: role.id, name: role.name, description: role.description ?? '' });
    this.modalMode.set('edit');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  save() {
    const f = this.form();
    if (!f.name.trim()) {
      this.modalError.set('El nombre del rol es obligatorio.');
      return;
    }
    this.saving.set(true);
    this.modalError.set(null);

    const payload = { name: f.name.trim(), description: f.description.trim() };

    const req = this.modalMode() === 'create'
      ? this.http.post<Role>(`${GATEWAY_URL}/auth/roles`, payload)
      : this.http.patch<Role>(`${GATEWAY_URL}/auth/roles/${f.id}`, payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.loadRoles();
      },
      error: err => {
        this.saving.set(false);
        const msg = err.error?.message;
        this.modalError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar.'));
      },
    });
  }

  confirmDelete(role: Role) { this.deleteTarget.set(role); }
  cancelDelete() { this.deleteTarget.set(null); }

  doDelete() {
    const r = this.deleteTarget();
    if (!r) return;
    this.deleting.set(true);
    this.http.delete(`${GATEWAY_URL}/auth/roles/${r.id}`).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.loadRoles();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
      },
    });
  }
}
