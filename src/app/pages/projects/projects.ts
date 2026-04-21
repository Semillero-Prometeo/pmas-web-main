import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

type FilterTag = 'all' | 'robotics' | 'ai' | 'hardware';

@Component({
  selector: 'app-projects',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './projects.html',
})
export class Projects {
  activeFilter = signal<FilterTag>('all');

  setFilter(tag: FilterTag) {
    this.activeFilter.set(tag);
  }
}
