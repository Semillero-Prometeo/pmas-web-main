import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-home',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './home.html',
})
export class Home {
  enfoques = [
    'Inteligencia artificial y computación en la nube',
    'Soluciones en ciberseguridad',
    'Innovación para el desarrollo sostenible',
    'Colaboración internacional',
    'Formación continua',
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
      tag: 'CNN // Visión',
      date: '2024',
      title: 'Modelo de reconocimiento de objetos',
      desc: 'Redes neuronales convolucionales para detección en tiempo real bajo condiciones variables de iluminación y oclusión.',
      icon: 'blur_on',
    },
    {
      tag: 'Deep Learning',
      date: '2024',
      title: 'Entrenamiento con deep learning',
      desc: 'Pipeline de entrenamiento optimizado con datasets anotados y técnicas de data augmentation adaptadas al contexto local.',
      icon: 'model_training',
    },
    {
      tag: 'Robótica // IA',
      date: '2024',
      title: 'Aplicación en robótica',
      desc: 'Integración de modelos de visión en sistemas robóticos autónomos para navegación inteligente y manipulación de objetos.',
      icon: 'smart_toy',
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
