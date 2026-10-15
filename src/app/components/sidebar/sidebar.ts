import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HealthStatusDropdown } from '../health-status-dropdown/health-status-dropdown';
import { AdminChromeService } from '../../core/services/admin-chrome.service';
import { HealthService, ServiceStatus } from '../../core/services/health.service';
import { AuthService } from '../../core/services/auth.service';

export type SidebarItem =
  | 'telemetry'
  | 'logs'
  | 'control'
  | 'users'
  | 'chat'
  | 'vision'
  | 'iframe';

type GroupHealthKey = 'robotics' | 'authMs';

interface SidebarGroup {
  id: string;
  label: string;
  icon: string;
  healthKey: GroupHealthKey;
  items: {
    id: SidebarItem;
    label: string;
    icon: string;
    route: string;
    queryParams?: Record<string, string>;
  }[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, HealthStatusDropdown],
  templateUrl: './sidebar.html',
})
export class Sidebar implements OnInit {
  /** Ítem activo; `null` si ninguno (p. ej. perfil). */
  @Input() activeItem: SidebarItem | null = null;

  /** `drawer`: panel móvil/compacto (siempre texto completo). `docked`: barra lateral escritorio. */
  @Input() variant: 'docked' | 'drawer' = 'docked';

  health = inject(HealthService);
  chrome = inject(AdminChromeService);
  private readonly auth = inject(AuthService);

  /** Texto y ancho completo (drawer o barra expandida). */
  expandedUi(): boolean {
    return this.variant === 'drawer' || !this.chrome.sidebarCollapsed();
  }

  openGroups = signal<string[]>(['robotica', 'autenticacion']);

  /** Robótica primero, luego Autenticación. */
  readonly groups: SidebarGroup[] = [
    {
      id: 'robotica',
      label: 'Robótica',
      icon: 'precision_manufacturing',
      healthKey: 'robotics',
      items: [
        { id: 'control', label: 'Movimientos', icon: 'settings_remote', route: '/control-panel' },
        { id: 'vision', label: 'Visión', icon: 'videocam', route: '/robotics/vision' },
        { id: 'chat', label: 'Chat', icon: 'forum', route: '/robotics/chat' },
        { id: 'telemetry', label: 'Creación de Secuencias', icon: 'insights', route: '/sequences' },
        { id: 'iframe', label: 'Panel Externo', icon: 'web', route: '/iframe' },
      ],
    },
    {
      id: 'autenticacion',
      label: 'Autenticación',
      icon: 'lock',
      healthKey: 'authMs',
      items: [
        { id: 'users', label: 'Usuarios', icon: 'group', route: '/admin/users' },
      ],
    },
  ];

  visibleGroups(): SidebarGroup[] {
    if (this.auth.activeRoleName() === 'ADMIN') return this.groups;
    return this.groups.filter((g) => g.id !== 'autenticacion');
  }

  ngOnInit() {
    this.health.checkAll();
  }

  toggleGroup(id: string) {
    this.openGroups.update((gs) => (gs.includes(id) ? gs.filter((g) => g !== id) : [...gs, id]));
  }

  isGroupOpen(id: string): boolean {
    return this.openGroups().includes(id);
  }

  groupStatus(group: SidebarGroup): ServiceStatus {
    switch (group.healthKey) {
      case 'robotics':
        return this.health.robotics();
      case 'authMs':
        return this.health.authMs();
    }
  }

  statusColor(status: ServiceStatus): string {
    switch (status) {
      case 'online':
        return 'bg-on-rail';
      case 'offline':
        return 'bg-error';
      case 'checking':
        return 'bg-on-rail/40 animate-pulse';
    }
  }
}
