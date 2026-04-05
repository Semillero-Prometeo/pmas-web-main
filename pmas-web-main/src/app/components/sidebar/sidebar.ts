import { Component, Input } from '@angular/core';

export type SidebarItem = 'sensors' | 'actuators' | 'telemetry' | 'logs';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  @Input() activeItem: SidebarItem = 'logs';
}
