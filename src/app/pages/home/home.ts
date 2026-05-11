import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { AuthService } from '../../core/services/auth.service';
import { CmsService } from '../../core/services/cms.service';
import { CmsProject, HomeContent, MethodologyStep, ModelBar, Impact } from '../../core/models/cms.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  auth = inject(AuthService);
  private readonly cmsService = inject(CmsService);
  readonly env = environment;

  heroTitle = signal('');
  heroDesc = signal('');
  enfoques = signal<string[]>([]);
  modelBars = signal<ModelBar[]>([]);
  methodology = signal<MethodologyStep[]>([]);
  impacts = signal<Impact[]>([]);
  rawProjects = signal<CmsProject[]>([]);

  projects = computed(() =>
    this.rawProjects().slice(0, 3).map((p) => ({
      tag: p.tags.join(' // '),
      date: p.year,
      title: p.title,
      desc: p.description,
      icon: p.icon ?? 'folder',
    })),
  );

  ngOnInit() {
    this.cmsService.getHome().subscribe((data: HomeContent | null) => {
      if (!data) return;
      this.heroTitle.set(data.hero_title);
      this.heroDesc.set(data.hero_desc);
      this.enfoques.set(data.enfoques);
      this.modelBars.set(data.model_bars);
      this.methodology.set(data.methodology);
      this.impacts.set(data.impacts);
    });

    this.cmsService.getProjects().subscribe((data) => this.rawProjects.set(data));
  }
}
