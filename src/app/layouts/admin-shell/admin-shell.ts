import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { RoboticsBottomNav } from '../../components/robotics-bottom-nav/robotics-bottom-nav';
import { Sidebar } from '../../components/sidebar/sidebar';
import type { SidebarItem } from '../../components/sidebar/sidebar';
import { AdminChromeService } from '../../core/services/admin-chrome.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, Navbar, Sidebar, Footer, RoboticsBottomNav],
  templateUrl: './admin-shell.html',
})
export class AdminShell implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly chrome = inject(AdminChromeService);

  readonly compact = signal(environment.compactMode);
  readonly drawerOpen = signal(false);
  readonly activeSidebarItem = signal<SidebarItem | null>(null);

  readonly mainClasses = computed(() => {
    const c = this.compact();
    if (c) {
      return 'min-h-screen pt-16 pb-[4.5rem] px-4 md:px-6';
    }
    const ml = this.chrome.sidebarCollapsed() ? 'md:ml-[4.5rem]' : 'md:ml-64';
    return `min-h-screen pt-20 px-4 md:px-8 pb-12 ${ml}`;
  });

  readonly footerWrapClasses = computed(() => {
    if (this.compact()) return '';
    const ml = this.chrome.sidebarCollapsed() ? 'md:ml-[4.5rem]' : 'md:ml-64';
    return ml;
  });

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncSidebarFromRoute());

    this.syncSidebarFromRoute();
  }

  private syncSidebarFromRoute(): void {
    let r: ActivatedRouteSnapshot | null = this.route.snapshot;
    while (r?.firstChild) {
      r = r.firstChild;
    }
    const raw = r?.data['sidebarActive'];
    const key = (raw === null || raw === undefined ? null : raw) as SidebarItem | null;
    this.activeSidebarItem.set(key);
    this.drawerOpen.set(false);
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  showSearchForRoute(): boolean {
    return this.router.url.startsWith('/control-panel');
  }
}
