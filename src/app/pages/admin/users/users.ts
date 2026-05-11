import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { GATEWAY_URL } from '../../../core/constants/gateway';

export interface DocumentType {
  id: string;
  name: string;
  key?: string;
}

export interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;

}

export interface User {
  id: string;
  username: string;
  is_active?: boolean;
  is_first_login?: boolean;
  person?: Person;
  user_role?: { role: { id: string; name: string } }[];
}

export interface Role {
  id: string;
  name: string;
}

type ModalMode = 'create' | 'edit';

interface UserForm {
  id: string;
  person_id: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  document_number: string;
  document_type_id: string;
  role_ids: string[];
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

  form = signal<UserForm>({
    id: '', person_id: '', username: '', email: '', password: '',
    first_name: '', last_name: '', phone: '', document_number: '',
    document_type_id: '', role_ids: [],
  });

  deleteTarget = signal<User | null>(null);
  deleting = signal(false);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<{ data: User[] } | User[]>(`${GATEWAY_URL}/users?skip=0&take=50`).subscribe({
      next: res => {
        this.users.set((res as { data: User[] }).data ?? (res as User[]) ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los usuarios.');
        this.loading.set(false);
      },
    });

    this.http.get<{ data: Role[] } | Role[]>(`${GATEWAY_URL}/roles?skip=0&take=50`).subscribe({
      next: res => this.roles.set((res as { data: Role[] }).data ?? (res as Role[]) ?? []),
    });

    this.http.get<{ data: DocumentType[] } | DocumentType[]>(`${GATEWAY_URL}/document-types`).subscribe({
      next: res => this.documentTypes.set((res as { data: DocumentType[] }).data ?? (res as DocumentType[]) ?? []),
      error: () => this.documentTypes.set([]),
    });
  }

  filteredUsers() {
    const q = this.search().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.person?.email?.toLowerCase().includes(q) ||
      u.person?.first_name?.toLowerCase().includes(q) ||
      u.person?.last_name?.toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.form.set({
      id: '', person_id: '', username: '', email: '', password: '',
      first_name: '', last_name: '', phone: '', document_number: '',
      document_type_id: this.documentTypes()[0]?.id ?? '',
      role_ids: [],
    });
    this.modalMode.set('create');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  openEdit(user: User) {
    this.form.set({
      id: user.id,
      person_id: user.person?.id ?? '',
      username: user.username,
      email: user.person?.email ?? '',
      password: '',
      first_name: user.person?.first_name ?? '',
      last_name: user.person?.last_name ?? '',
      role_ids: user.user_role?.map(ur => ur.role.id) ?? [],
      phone: '',
      document_number: '',
      document_type_id: ''
    });
    this.modalMode.set('edit');
    this.modalError.set(null);
    this.modalOpen.set(true);
  }

  isRoleSelected(roleId: string): boolean {
    return this.form().role_ids.includes(roleId);
  }

  toggleRole(roleId: string) {
    this.form.update(f => ({
      ...f,
      role_ids: f.role_ids.includes(roleId)
        ? f.role_ids.filter(id => id !== roleId)
        : [...f.role_ids, roleId],
    }));
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  save() {
    const f = this.form();
    if (!f.email.trim() || !f.first_name.trim() || !f.last_name.trim()) {
      this.modalError.set('Nombre, apellido y correo son obligatorios.');
      return;
    }
    if (this.modalMode() === 'create' && !f.document_number.trim()) {
      this.modalError.set('Número de documento es obligatorio.');
      return;
    }
    this.saving.set(true);
    this.modalError.set(null);

    if (this.modalMode() === 'create') {
      this.createUser(f);
    } else {
      this.updateUser(f);
    }
  }

  private createUser(f: UserForm) {
    // Step 1: POST /person
    this.http.post<Person>(`${GATEWAY_URL}/person`, {
      document_type_id: f.document_type_id,
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      document_number: f.document_number.trim(),
      phone: f.phone.trim(),
      email: f.email.trim(),
    }).pipe(
      // Step 2: POST /users with person_id
      switchMap(person =>
        this.http.post<User>(`${GATEWAY_URL}/users`, {
          person_id: person.id,
          username: f.email.trim(),
        })
      ),
      // Step 3: POST /roles/set-roles (if roles selected)
      switchMap(user =>
        f.role_ids.length > 0
          ? this.http.post(`${GATEWAY_URL}/roles/set-roles`, {
              user_id: user.id,
              roles_id: f.role_ids,
            }).pipe(map(() => user))
          : of(user)
      )
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.loadAll();
      },
      error: err => {
        this.saving.set(false);
        const msg = err.error?.message;
        this.modalError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al crear usuario.'));
      },
    });
  }

  private updateUser(f: UserForm) {
    const calls: Observable<unknown>[] = [];

    // Update user (username y/o password)
    const userPayload: Record<string, string> = {};
    if (f.username.trim()) userPayload['username'] = f.username.trim();
    if (f.password.trim()) userPayload['password'] = f.password.trim();
    if (Object.keys(userPayload).length > 0) {
      calls.push(this.http.put(`${GATEWAY_URL}/users/${f.id}`, userPayload));
    }

    // Update person data
    if (f.person_id) {
     calls.push(this.http.put(`${GATEWAY_URL}/person/${f.person_id}`, {
  first_name: f.first_name.trim(),
  last_name: f.last_name.trim(),
  email: f.email.trim(),
  phone: f.phone.trim(),
}));
    }

    // Update roles
    calls.push(this.http.post(`${GATEWAY_URL}/roles/set-roles`, {
      user_id: f.id,
      roles_id: f.role_ids,
    }));

    (calls.length === 1 ? calls[0] : forkJoin(calls)).subscribe({
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

  confirmDelete(user: User) { this.deleteTarget.set(user); }
  cancelDelete() { this.deleteTarget.set(null); }

  doDelete() {
    const u = this.deleteTarget();
    if (!u) return;
    this.deleting.set(true);
    this.http.delete(`${GATEWAY_URL}/users/${u.id}`).subscribe({
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
