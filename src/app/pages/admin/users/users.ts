import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { GATEWAY_URL } from '../../../core/constants/gateway';

export interface Person {
  first_name: string;
  last_name: string;
  document_number?: string;
  phone?: string;
  document_type_id?: string;
  document_type?: { id: string; name: string };
}

export interface User {
  id: string;
  username: string;
  person?: Person;
  user_role?: { role: { id: string; name: string } }[];
}

export interface Role {
  id: string;
  name: string;
}

export interface DocumentType {
  id: string;
  name: string;
}

type ModalMode = 'create' | 'edit';

const PASSWORD_OK = /^(?=.*[a-z])(?=.*[A-Z])(?=.*(?:\d|[^\w\s]))(?!.*[.\n]).*$/;

const emptyForm = () => ({
  id: '',
  username: '',
  password: '',
  role_ids: [] as string[],
  first_name: '',
  last_name: '',
  document_type_id: '',
  document_number: '',
  phone: '',
});

function unwrapList<T>(res: { data: T[] } | T[]): T[] {
  return Array.isArray(res) ? res : (res?.data ?? []);
}

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  private http = inject(HttpClient);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  documentTypes = signal<DocumentType[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  search = signal('');

  modalOpen = signal(false);
  modalMode = signal<ModalMode>('create');
  saving = signal(false);
  modalError = signal<string | null>(null);

  form = signal(emptyForm());

  deleteTarget = signal<User | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<{ data: User[] } | User[]>(`${GATEWAY_URL}/users?skip=0&take=50`).subscribe({
      next: (res) => {
        this.users.set(unwrapList(res));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });

    this.http.get<{ data: Role[] } | Role[]>(`${GATEWAY_URL}/roles?skip=0&take=50`).subscribe({
      next: (res) => this.roles.set(unwrapList(res)),
    });

    this.http.get<{ data: DocumentType[] } | DocumentType[]>(`${GATEWAY_URL}/document-types`).subscribe({
      next: (res) => this.documentTypes.set(unwrapList(res)),
    });
  }

  filteredUsers() {
    const q = this.search().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.person?.first_name?.toLowerCase().includes(q) ||
        u.person?.last_name?.toLowerCase().includes(q) ||
        u.person?.document_number?.toLowerCase().includes(q),
    );
  }

  openCreate() {
    this.form.set({
      ...emptyForm(),
      role_ids: this.roles()[0] ? [this.roles()[0].id] : [],
      document_type_id: this.documentTypes()[0]?.id ?? '',
    });
    this.modalMode.set('create');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(user: User) {
    const p = user.person;
    this.form.set({
      id: user.id,
      username: user.username,
      password: '',
      role_ids: user.user_role?.map((ur) => ur.role.id) ?? [],
      first_name: p?.first_name ?? '',
      last_name: p?.last_name ?? '',
      document_type_id: p?.document_type_id ?? p?.document_type?.id ?? '',
      document_number: p?.document_number ?? '',
      phone: p?.phone ?? '',
    });
    this.modalMode.set('edit');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  isRoleSelected(roleId: string): boolean {
    return this.form().role_ids.includes(roleId);
  }

  toggleRole(roleId: string) {
    this.form.update((f) => {
      const ids = f.role_ids.includes(roleId)
        ? f.role_ids.filter((id) => id !== roleId)
        : [...f.role_ids, roleId];
      return { ...f, role_ids: ids };
    });
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  save() {
    const f = this.form();
    if (!f.username) {
      this.modalError.set('El correo es obligatorio.');
      return;
    }
    if (!f.first_name || !f.last_name) {
      this.modalError.set('Nombres y apellidos son obligatorios.');
      return;
    }
    if (!f.document_type_id || !f.document_number) {
      this.modalError.set('Tipo y número de documento son obligatorios.');
      return;
    }
    if (!f.role_ids.length) {
      this.modalError.set('Elige al menos un rol.');
      return;
    }
    if (this.modalMode() === 'create') {
      if (!f.password || f.password.length < 8 || !PASSWORD_OK.test(f.password)) {
        this.modalError.set(
          'La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y un número o carácter especial.',
        );
        return;
      }
    } else if (f.password && (f.password.length < 8 || !PASSWORD_OK.test(f.password))) {
      this.modalError.set(
        'La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y un número o carácter especial.',
      );
      return;
    }
    this.saving.set(true);
    this.modalError.set(null);
    const payload: {
      username: string;
      password?: string;
      role_ids: string[];
      person: {
        first_name: string;
        last_name: string;
        document_type_id: string;
        document_number: string;
        phone?: string;
      };
    } = {
      username: f.username,
      role_ids: f.role_ids,
      person: {
        first_name: f.first_name,
        last_name: f.last_name,
        document_type_id: f.document_type_id,
        document_number: f.document_number,
        ...(f.phone ? { phone: f.phone } : {}),
      },
    };
    if (f.password) payload.password = f.password;
    const req =
      this.modalMode() === 'create'
        ? this.http.post(`${GATEWAY_URL}/users`, payload)
        : this.http.put(`${GATEWAY_URL}/users/${f.id}`, payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.loadAll();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err.error?.message;
        this.modalError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al guardar.'));
      },
    });
  }

  confirmDelete(user: User) {
    this.deleteError.set(null);
    this.deleteTarget.set(user);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
    this.deleteError.set(null);
  }

  doDelete() {
    const u = this.deleteTarget();
    if (!u) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    this.http
      .patch(`${GATEWAY_URL}/users/inactive`, {
        user_id: u.id,
        reason: 'Baja desde mesa de control',
      })
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteTarget.set(null);
          this.loadAll();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err.error?.message;
          this.deleteError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'No se pudo dar de baja.'));
        },
      });
  }

  userRoles(user: User): string {
    return user.user_role?.map((ur) => ur.role.name).join(', ') ?? '—';
  }

  displayName(user: User): string {
    const p = user.person;
    if (p?.first_name) return `${p.first_name} ${p.last_name}`;
    return user.username;
  }

  displayDocument(user: User): string {
    return user.person?.document_number ?? '—';
  }
}
