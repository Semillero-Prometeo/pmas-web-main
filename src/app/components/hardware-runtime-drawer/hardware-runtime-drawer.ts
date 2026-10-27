import { Component, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { formatDurationMs } from '../../core/services/hardware-runtime';
import { HardwareRuntimeService } from '../../core/services/hardware-runtime.service';
import { phaseLabel, sourceHint } from '../../pages/control-panel/panel-kpis';

@Component({
  selector: 'app-hardware-runtime-drawer',
  templateUrl: './hardware-runtime-drawer.html',
})
export class HardwareRuntimeDrawer {
  readonly runtime = inject(HardwareRuntimeService);
  readonly compact = environment.compactMode;
  readonly phaseLabel = phaseLabel;
  readonly sourceHint = sourceHint;
  readonly formatDurationMs = formatDurationMs;
}
