import { Component, OnInit, inject, signal } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { CmsService } from '../../core/services/cms.service';
import { CmsMember } from '../../core/models/cms.models';

@Component({
  selector: 'app-team',
  imports: [Navbar, Footer],
  templateUrl: './team.html',
})
export class Team implements OnInit {
  private readonly cmsService = inject(CmsService);

  members = signal<CmsMember[]>([]);

  ngOnInit() {
    this.cmsService.getMembers().subscribe((data) => this.members.set(data));
  }
}
