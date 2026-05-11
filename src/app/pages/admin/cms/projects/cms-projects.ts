import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CmsService } from '../../../../core/services/cms.service';
import { CmsProject, CreateProjectPayload } from '../../../../core/models/cms.models';

type ModalMode = 'create' | 'edit';

const emptyForm = (): CreateProjectPayload => ({
  title: '',
  description: '',
  tags: [''],
  status: 'En Desarrollo',
  image: null,
  year: new Date().getFullYear().toString(),
  icon: 'folder',
  display_order: 0,
  featured: false,
});

@Component({
  selector: 'app-cms-projects',
  imports: [FormsModule],
  templateUrl: './cms-projects.html',
})
export class CmsProjects implements OnInit {
  private readonly cms = inject(CmsService);

  projects = signal<CmsProject[]>([]);
  loading = signal(true);
  saving = signal(false);
  deleting = signal<string | null>(null);
  error = signal<string | null>(null);

  showModal = signal(false);
  modalMode = signal<ModalMode>('create');
  editingId = signal<string | null>(null);
  form = signal<CreateProjectPayload>(emptyForm());

  confirmDeleteId = signal<string | null>(null);

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.loading.set(true);
    this.cms.getProjects().subscribe({
      next: (data) => { this.projects.set(data); this.loading.set(false); },
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

  openEdit(p: CmsProject) {
    this.form.set({
      title: p.title,
      description: p.description,
      tags: [...p.tags],
      status: p.status,
      image: p.image,
      year: p.year,
      icon: p.icon,
      display_order: p.display_order,
      featured: p.featured,
    });
    this.editingId.set(p.id);
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

  addTag() {
    this.form.update((f) => ({ ...f, tags: [...f.tags, ''] }));
  }

  removeTag(i: number) {
    this.form.update((f) => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }));
  }

  updateTag(i: number, val: string) {
    this.form.update((f) => {
      const tags = [...f.tags];
      tags[i] = val;
      return { ...f, tags };
    });
  }

  save() {
    this.saving.set(true);
    this.error.set(null);
    const payload = this.form();
    const req = this.modalMode() === 'create'
      ? this.cms.createProject(payload)
      : this.cms.updateProject(this.editingId()!, payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.loadProjects();
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

  deleteProject() {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.deleting.set(id);
    this.cms.deleteProject(id).subscribe({
      next: () => { this.deleting.set(null); this.confirmDeleteId.set(null); this.loadProjects(); },
      error: () => this.deleting.set(null),
    });
  }
}
