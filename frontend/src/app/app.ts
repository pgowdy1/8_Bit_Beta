import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouteForm } from './components/route-form/route-form';
import { TopoCanvas } from './components/topo-canvas/topo-canvas';
import { NesDialog } from './components/nes-dialog/nes-dialog';

@Component({
  selector: 'app-root',
  imports: [RouteForm, TopoCanvas, NesDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
