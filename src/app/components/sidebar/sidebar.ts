import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HealthService, ServiceStatus } from '../../core/services/health.service';

export type SidebarItem = 'telemetry' | 'logs' | 'control' | 'users' | 'roles' | 'management' | 'chat';

interface SidebarGroup {
  id: string;
  label: string;
  icon: string;
  healthKey?: 'gateway' | 'management' | 'robotics';
  items: { id: SidebarItem; label: string; icon: string; route: string; queryParams?: Record<string, string> }[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.html',
})
export class Sidebar implements OnInit {
  @Input() activeItem: SidebarItem = 'logs';

  health = inject(HealthService);

  openGroups = signal<string[]>(['robotica']);

  readonly groups: SidebarGroup[] = [
    {
      id: 'autenticacion',
      label: 'Autenticación',
      icon: 'lock',
      healthKey: 'gateway',
      items: [
        { id: 'users',      label: 'Usuarios',  icon: 'group',          route: '/admin/users' },
        { id: 'roles',      label: 'Roles',     icon: 'badge',          route: '/admin/roles' },
      ],
    },
    {
      id: 'gestion',
      label: 'Gestión',
      icon: 'admin_panel_settings',
      healthKey: 'management',
      items: [
        { id: 'management', label: 'Panel',     icon: 'dashboard',      route: '/admin/management' },
      ],
    },
    {
      id: 'robotica',
      label: 'Robótica',
      icon: 'precision_manufacturing',
      healthKey: 'robotics',
      items: [
        { id: 'control',    label: 'Movimientos',    icon: 'settings_remote', route: '/control-panel' },
        { id: 'chat',       label: 'Chat',       icon: 'forum',           route: '/robotics/chat' },
        { id: 'telemetry',  label: 'Creación de Secuencias', icon: 'insights',        route: '/sequences' },
      ],
    },
  ];

  ngOnInit() {
    this.health.checkAll();
  }

  toggleGroup(id: string) {
    this.openGroups.update(gs =>
      gs.includes(id) ? gs.filter(g => g !== id) : [...gs, id]
    );
  }

  isGroupOpen(id: string): boolean {
    return this.openGroups().includes(id);
  }

  groupStatus(group: SidebarGroup): ServiceStatus {
    if (!group.healthKey) return 'checking';
    return this.health[group.healthKey]();
  }

  statusColor(status: ServiceStatus): string {
    switch (status) {
      case 'online':   return 'bg-secondary';
      case 'offline':  return 'bg-error';
      case 'checking': return 'bg-outline animate-pulse';
    }
  }
}
