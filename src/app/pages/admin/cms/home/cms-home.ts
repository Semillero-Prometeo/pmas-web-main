import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CmsService } from '../../../../core/services/cms.service';
import { HomeContent, MethodologyStep } from '../../../../core/models/cms.models';

@Component({
  selector: 'app-cms-home',
  imports: [FormsModule],
  templateUrl: './cms-home.html',
})
export class CmsHome implements OnInit {
  private readonly cms = inject(CmsService);

  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);

  form = signal<Omit<HomeContent, 'id' | 'created_at' | 'updated_at'>>({
    hero_title: '',
    hero_desc: '',
    enfoques: [''],
    methodology: [{ step: '01', label: '', icon: '' }],
    model_bars: [{ label: '', value: '', color: 'text-primary', bgClass: 'bg-primary', width: '100%' }],
    impacts: [{ icon: '', colorClass: 'text-primary', bgClass: 'bg-primary/10', label: '', desc: '' }],
  });

  ngOnInit() {
    this.cms.getHome().subscribe({
      next: (data) => {
        if (data) {
          this.form.set({
            hero_title: data.hero_title,
            hero_desc: data.hero_desc,
            enfoques: [...data.enfoques],
            methodology: data.methodology.map((m) => ({ ...m })),
            model_bars: data.model_bars.map((b) => ({ ...b })),
            impacts: data.impacts.map((i) => ({ ...i })),
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Hero ──────────────────────────────────────────────────
  setHeroTitle(val: string) {
    this.form.update((f) => ({ ...f, hero_title: val }));
  }

  setHeroDesc(val: string) {
    this.form.update((f) => ({ ...f, hero_desc: val }));
  }

  // ── Enfoques ──────────────────────────────────────────────
  addEnfoque() {
    this.form.update((f) => ({ ...f, enfoques: [...f.enfoques, ''] }));
  }

  removeEnfoque(i: number) {
    this.form.update((f) => ({ ...f, enfoques: f.enfoques.filter((_, idx) => idx !== i) }));
  }

  updateEnfoque(i: number, val: string) {
    this.form.update((f) => {
      const enfoques = [...f.enfoques];
      enfoques[i] = val;
      return { ...f, enfoques };
    });
  }

  // ── Methodology ───────────────────────────────────────────
  addStep() {
    this.form.update((f) => ({
      ...f,
      methodology: [...f.methodology, { step: String(f.methodology.length + 1).padStart(2, '0'), label: '', icon: '' }],
    }));
  }

  removeStep(i: number) {
    this.form.update((f) => ({ ...f, methodology: f.methodology.filter((_, idx) => idx !== i) }));
  }

  updateStep(i: number, field: keyof MethodologyStep, val: string) {
    this.form.update((f) => {
      const methodology = f.methodology.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
      return { ...f, methodology };
    });
  }

  // ── Save ──────────────────────────────────────────────────
  save() {
    this.saving.set(true);
    this.error.set(null);
    this.cms.upsertHome(this.form()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Error al guardar');
      },
    });
  }
}
