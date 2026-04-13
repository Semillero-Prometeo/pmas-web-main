import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { SidebarItem } from '../sidebar/sidebar';

/** Navegación compacta solo Robótica (estilo móvil). */
@Component({
  selector: 'app-robotics-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './robotics-bottom-nav.html',
})
export class RoboticsBottomNav {
  @Input() activeItem: SidebarItem | null = null;

  readonly links: { id: SidebarItem; label: string; icon: string; route: string }[] = [
    { id: 'control', label: 'Mov.', icon: 'settings_remote', route: '/control-panel' },
    { id: 'vision', label: 'Visión', icon: 'videocam', route: '/robotics/vision' },
    { id: 'chat', label: 'Chat', icon: 'forum', route: '/robotics/chat' },
    { id: 'telemetry', label: 'Seq.', icon: 'insights', route: '/sequences' },
  ];
}
