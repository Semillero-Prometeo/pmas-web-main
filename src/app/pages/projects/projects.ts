import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { CmsService } from '../../core/services/cms.service';
import { CmsProject } from '../../core/models/cms.models';

type FilterTag = 'all' | 'robotics' | 'ai' | 'hardware';

const TAG_FILTER_MAP: Record<FilterTag, string[]> = {
  all: [],
  robotics: ['robótica', 'robot', 'robotics'],
  ai: ['ia', 'inteligencia artificial', 'machine learning', 'visión artificial', 'ai'],
  hardware: ['hardware', 'electrónica', 'sensores'],
};

@Component({
  selector: 'app-projects',
  imports: [Navbar, Footer],
  templateUrl: './projects.html',
})
export class Projects implements OnInit {
  private readonly cmsService = inject(CmsService);

  activeFilter = signal<FilterTag>('all');
  allProjects = signal<CmsProject[]>([]);
  loading = signal(true);

  filteredProjects = computed(() => {
    const filter = this.activeFilter();
    const all = this.allProjects();
    if (filter === 'all') return all;
    const keywords = TAG_FILTER_MAP[filter];
    return all.filter((p) =>
      p.tags.some((tag) => keywords.some((kw) => tag.toLowerCase().includes(kw))),
    );
  });

  featuredProject = computed(() => this.allProjects().find((p) => p.featured) ?? this.allProjects()[0] ?? null);

  setFilter(tag: FilterTag) {
    this.activeFilter.set(tag);
  }

  ngOnInit() {
    this.cmsService.getProjects().subscribe((data) => {
      this.allProjects.set(data);
      this.loading.set(false);
    });
  }
}
