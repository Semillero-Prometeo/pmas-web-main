import { Component, Input, computed, inject } from '@angular/core';

import { HealthService, ServiceStatus } from '../../core/services/health.service';

interface HealthEntry {
  label: string;
  status: ServiceStatus;
}

@Component({
  selector: 'app-health-status-dropdown',
  templateUrl: './health-status-dropdown.html',
})
export class HealthStatusDropdown {
  @Input() compact = false;
  @Input() title = 'Estado de servicios';

  readonly health = inject(HealthService);

  readonly entries = computed<HealthEntry[]>(() => [
    { label: 'Gateway', status: this.health.gateway() },
    { label: 'Auth', status: this.health.authMs() },
    { label: 'Gestión', status: this.health.management() },
    { label: 'Robótica', status: this.health.robotics() },
    { label: 'MAI Core', status: this.health.maiCore() },
  ]);

  readonly onlineCount = computed(() => this.entries().filter((item) => item.status === 'online').length);

  statusDot(status: ServiceStatus): string {
    switch (status) {
      case 'online':
        return 'bg-secondary';
      case 'offline':
        return 'bg-error';
      case 'checking':
        return 'bg-outline animate-pulse';
    }
  }

  statusText(status: ServiceStatus): string {
    return this.health.statusLabel(status);
  }
}
