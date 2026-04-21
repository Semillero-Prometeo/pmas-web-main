import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { GATEWAY_URL } from '../../../core/constants/gateway';

export interface User {
  id: number;
  username: string;
  email: string;
  person?: { first_name: string; last_name: string };
  user_role?: { role: { id: number; name: string } }[];
  is_active?: boolean;
}

export interface Role {
  id: number;
  name: string;
}

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  private http = inject(HttpClient);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  search = signal('');

  // Modal
  modalOpen = signal(false);
  modalMode = signal<ModalMode>('create');
  saving = signal(false);
  modalError = signal<string | null>(null);

  form = signal({
    id: 0,
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role_ids: [] as number[],
  });

  // Delete confirm
  deleteTarget = signal<User | null>(null);
  deleting = signal(false);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<{ data: User[] } | User[]>(`${GATEWAY_URL}/users?skip=0&take=50`).subscribe({
      next: (res: { data: User[] } | User[]) => {
        this.users.set((res as { data: User[] }).data ?? (res as User[]) ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });

    this.http.get<{ data: Role[] } | Role[]>(`${GATEWAY_URL}/roles?skip=0&take=10`).subscribe({
      next: (res: { data: Role[] } | Role[]) => this.roles.set((res as { data: Role[] }).data ?? (res as Role[]) ?? []),
    });
  }

  filteredUsers() {
    const q = this.search().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.person?.first_name?.toLowerCase().includes(q) ||
      u.person?.last_name?.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form.set({ id: 0, username: '', email: '', password: '', first_name: '', last_name: '', role_ids: this.roles()[0] ? [this.roles()[0].id] : [] });
    this.modalMode.set('create');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(user: User) {
    this.form.set({
      id: user.id,
      username: user.username,
      email: user.email ?? '',
      password: '',
      first_name: user.person?.first_name ?? '',
      last_name: user.person?.last_name ?? '',
      role_ids: user.user_role?.map(ur => ur.role.id) ?? [],
    });
    this.modalMode.set('edit');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  isRoleSelected(roleId: number): boolean {
    return this.form().role_ids.includes(roleId);
  }

  toggleRole(roleId: number) {
    this.form.update(f => {
      const ids = f.role_ids.includes(roleId)
        ? f.role_ids.filter((id: number) => id !== roleId)
        : [...f.role_ids, roleId];
      return { ...f, role_ids: ids };
    });
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  save() {
    const f = this.form();
    if (!f.username || !f.email) {
      this.modalError.set('Usuario y correo son obligatorios.');
      return;
    }
    this.saving.set(true);
    this.modalError.set(null);

    const payload: any = {
      username: f.username,
      email: f.email,
      first_name: f.first_name,
      last_name: f.last_name,
      role_ids: f.role_ids,
    };
    if (f.password) payload.password = f.password;

    const req = this.modalMode() === 'create'
      ? this.http.post<User>(`${GATEWAY_URL}/auth/users`, payload)
      : this.http.patch<User>(`${GATEWAY_URL}/auth/users/${f.id}`, payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.loadAll();
      },
      error: err => {
        this.saving.set(false);
        const msg = err.error?.message;
        this.modalError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar.'));
      },
    });
  }

  confirmDelete(user: User) {
    this.deleteTarget.set(user);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  doDelete() {
    const u = this.deleteTarget();
    if (!u) return;
    this.deleting.set(true);
    this.http.delete(`${GATEWAY_URL}/auth/users/${u.id}`).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.loadAll();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
      },
    });
  }

  userRoles(user: User): string {
    return user.user_role?.map(ur => ur.role.name).join(', ') ?? '—';
  }

  displayName(user: User): string {
    const p = user.person;
    if (p?.first_name) return `${p.first_name} ${p.last_name}`;
    return user.username;
  }
}
