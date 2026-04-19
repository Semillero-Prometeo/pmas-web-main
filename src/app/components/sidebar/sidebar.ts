import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminChromeService } from '../../core/services/admin-chrome.service';
import { HealthService, ServiceStatus } from '../../core/services/health.service';

export type SidebarItem =
  | 'telemetry'
  | 'logs'
  | 'control'
  | 'users'
  | 'roles'
  | 'management'
  | 'chat'
  | 'vision'
  | 'iframe';

type GroupHealthKey = 'robotics' | 'authMs' | 'management';

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
  imports: [RouterLink],
  templateUrl: './sidebar.html',
})
export class Sidebar implements OnInit {
  /** Ítem activo; `null` si ninguno (p. ej. perfil). */
  @Input() activeItem: SidebarItem | null = null;

  /** `drawer`: panel móvil/compacto (siempre texto completo). `docked`: barra lateral escritorio. */
  @Input() variant: 'docked' | 'drawer' = 'docked';

  health = inject(HealthService);
  chrome = inject(AdminChromeService);

  /** Texto y ancho completo (drawer o barra expandida). */
  expandedUi(): boolean {
    return this.variant === 'drawer' || !this.chrome.sidebarCollapsed();
  }

  openGroups = signal<string[]>(['robotica', 'autenticacion', 'gestion']);

  /** Robótica primero, luego Autenticación y Gestión. */
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
        { id: 'roles', label: 'Roles', icon: 'badge', route: '/admin/roles' },
      ],
    },
    {
      id: 'gestion',
      label: 'Gestión',
      icon: 'admin_panel_settings',
      healthKey: 'management',
      items: [{ id: 'management', label: 'Panel', icon: 'dashboard', route: '/admin/management' }],
    },
  ];

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
      case 'management':
        return this.health.management();
    }
  }

  statusColor(status: ServiceStatus): string {
    switch (status) {
      case 'online':
        return 'bg-secondary';
      case 'offline':
        return 'bg-error';
      case 'checking':
        return 'bg-outline animate-pulse';
    }
  }
}
