import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CmsService } from '../../../../core/services/cms.service';
import { CmsMember, CreateMemberPayload } from '../../../../core/models/cms.models';

type ModalMode = 'create' | 'edit';

const emptyForm = (): CreateMemberPayload => ({
  name: '',
  role: 'Semillerista',
  bio: '',
  image: null,
  display_order: 0,
});

@Component({
  selector: 'app-cms-members',
  imports: [FormsModule],
  templateUrl: './cms-members.html',
})
export class CmsMembers implements OnInit {
  private readonly cms = inject(CmsService);

  members = signal<CmsMember[]>([]);
  loading = signal(true);
  saving = signal(false);
  deleting = signal<string | null>(null);
  error = signal<string | null>(null);

  showModal = signal(false);
  modalMode = signal<ModalMode>('create');
  editingId = signal<string | null>(null);
  form = signal<CreateMemberPayload>(emptyForm());

  confirmDeleteId = signal<string | null>(null);

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    this.loading.set(true);
    this.cms.getMembers().subscribe({
      next: (data) => { this.members.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.form.set(emptyForm());
    this.editingId.set(null);
    this.modalMode.set('create');
    this.error.set(null);
    this.showModal.set(true);
  }

  openEdit(m: CmsMember) {
    this.form.set({ name: m.name, role: m.role, bio: m.bio, image: m.image, display_order: m.display_order });
    this.editingId.set(m.id);
    this.modalMode.set('edit');
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async onImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const b64 = await this.cms.fileToBase64(file);
    this.form.update((f) => ({ ...f, image: b64 }));
  }

  save() {
    this.saving.set(true);
    this.error.set(null);
    const payload = this.form();
    const req = this.modalMode() === 'create'
      ? this.cms.createMember(payload)
      : this.cms.updateMember(this.editingId()!, payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.loadMembers();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al guardar');
      },
    });
  }

  confirmDelete(id: string) {
    this.confirmDeleteId.set(id);
  }

  cancelDelete() {
    this.confirmDeleteId.set(null);
  }

  deleteMember() {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.deleting.set(id);
    this.cms.deleteMember(id).subscribe({
      next: () => { this.deleting.set(null); this.confirmDeleteId.set(null); this.loadMembers(); },
      error: () => this.deleting.set(null),
    });
  }
}
