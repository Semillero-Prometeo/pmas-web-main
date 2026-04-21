import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

interface Member {
  name: string;
  role: string;
  bio: string;
  image: string;
}

@Component({
  selector: 'app-team',
  imports: [Navbar, Footer],
  templateUrl: './team.html',
})
export class Team {
  members: Member[] = [
    {
      name: 'Semillerista 1',
      role: 'Semillerista',
      bio: 'Investigación en inteligencia artificial y visión artificial aplicada al reconocimiento de objetos en entornos reales.',
      image: 'assets/assets/ac217e82-IMG-20250508-WA0007.jpg',
    },
    {
      name: 'Semillerista 2',
      role: 'Semillerista',
      bio: 'Desarrollo de hardware y software para el proyecto ANDROIDE R-ONE, con énfasis en integración electrónica.',
      image: 'assets/assets/IMG_20250508_121354.jpg',
    },
    {
      name: 'Semillerista 3',
      role: 'Semillerista',
      bio: 'Investigación en sistemas robóticos con sensores y capacidades de visión artificial en el proyecto CLAUD-IA.',
      image: 'assets/assets/IMG-20250929-WA0004.jpg',
    },
    {
      name: 'Semillerista 4',
      role: 'Semillerista',
      bio: 'Aplicación de metodologías de Machine Learning y computación en la nube orientadas al desarrollo sostenible.',
      image: 'assets/assets/IMG-20251106-WA0032.jpg',
    },
  ];
}
