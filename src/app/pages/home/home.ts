import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './home.html',
})
export class Home {
  auth = inject(AuthService);
  readonly env = environment;
  enfoques = [
    'Creación de proyectos de investigación aplicada en problemáticas tecnológicas emergentes.',
    'Metodologías en inteligencia artificial, computación en la nube y ciberseguridad.',
    'Colaboración interinstitucional e internacional.',
    'Formación continua en nuevas tecnologías.',
    'Soluciones tecnológicas alineadas con los ODS.',
  ];

  modelBars = [
    { label: 'Accuracy', value: '98.2%', color: 'text-primary', bgClass: 'bg-primary', width: '98%' },
    { label: 'Precision', value: '96.7%', color: 'text-secondary', bgClass: 'bg-secondary', width: '97%' },
    { label: 'Recall', value: '94.1%', color: 'text-tertiary', bgClass: 'bg-tertiary', width: '94%' },
  ];

  methodology = [
    { step: '01', label: 'Revisión bibliográfica', icon: 'menu_book' },
    { step: '02', label: 'Recolección de datos', icon: 'database' },
    { step: '03', label: 'Preprocesamiento', icon: 'tune' },
    { step: '04', label: 'Entrenamiento del modelo', icon: 'model_training' },
    { step: '05', label: 'Evaluación', icon: 'fact_check' },
    { step: '06', label: 'Mejora continua', icon: 'autorenew' },
    { step: '07', label: 'Aplicación práctica', icon: 'smart_toy' },
  ];

  projects = [
    {
      tag: 'IA // Visión Artificial',
      date: '2024',
      title: 'Reconocimiento automático de objetos en entornos reales',
      desc: 'Sistema basado en inteligencia artificial capaz de reconocer y clasificar objetos en entornos reales mediante Machine Learning y visión artificial.',
      icon: 'blur_on',
    },
    {
      tag: 'Robótica // Hardware',
      date: '2024',
      title: 'ANDROIDE R-ONE',
      desc: 'Desarrollo de un androide funcional integrando hardware, software y electrónica con capacidades de inteligencia artificial.',
      icon: 'smart_toy',
    },
    {
      tag: 'Robótica // Sensores',
      date: '2024',
      title: 'CLAUD-IA',
      desc: 'Sistema robótico con sensores y capacidades de visión artificial optimizadas, integrando hardware, software y electrónica.',
      icon: 'sensors',
    },
  ];

  impacts = [
    {
      icon: 'eco',
      colorClass: 'text-tertiary',
      bgClass: 'bg-tertiary/10',
      label: 'Ambiental',
      desc: 'Reducción de residuos tecnológicos',
    },
    {
      icon: 'groups',
      colorClass: 'text-secondary',
      bgClass: 'bg-secondary/10',
      label: 'Social',
      desc: 'Mejora en calidad de vida',
    },
    {
      icon: 'school',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
      label: 'Académico',
      desc: 'Formación en IA y sistemas',
    },
    {
      icon: 'trending_up',
      colorClass: 'text-tertiary',
      bgClass: 'bg-tertiary/10',
      label: 'Económico',
      desc: 'Creación de oportunidades',
    },
  ];
}
