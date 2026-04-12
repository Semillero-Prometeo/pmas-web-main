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
      name: 'Elena Rossi',
      role: 'PhD Candidate',
      bio: 'Specializing in swarm intelligence and decentralized command protocols for aerial drone units.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDb1h3wjnU-14RCgwKqvY64ucGmNbJK_N0G-TN1PlQtEev-zjFSEaSpOPYNcpIufCOm9FXGkXyUlozgIJx90qAnilquNc5aZjpqrJNAhMKC_nipZrfRaBLguj6KPV080GhNiMF6lS2Zgqsx1o1cjaJ4ds3JkZb5WIusUyhUZyTdh0bxy1VclP4pyKGM9GtiUYA9ZPEMYKRwqHNSMwzApmdouhuF_qHCzDsTPyWnspfQsEB6Nf2p52VN7ABo7_iCldlavkR5uMa-Nlc',
    },
    {
      name: 'Marcus Chen',
      role: 'Undergrad Assistant',
      bio: 'Focusing on real-time data visualization and telemetry UI for high-speed robotic testing.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpeg-EbSj7kantpkxpTwyqnNX-dq9JoBaHbK46b7ld-zCUe-P_Vw84vqFDULRVRBIjJOi_mQ04S9ytnAwz5ERpe6vs2KWOnwbUVMhwBX9T-58m29MCXqNdPSZPi8pe1fbVAEwUo8jhqi1uZuozfaFtnE8eR1LBJoj_rONyWqPab5qSD48Vk6O6XuiZNG9X2JXga7PkvbNx52dMHqybWXeInCIqHO8Y0aNWb247IE6Y4StssYYGM1DBKQ38xDXGYeZouK1HWBYu2bk',
    },
    {
      name: 'Dr. Sarah Jenkins',
      role: 'Lead Engineer',
      bio: 'Expert in precision manufacturing and CNC machining for custom robotic skeletal frames.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATjPDrVTHkiR86MgvUI5sE5Fd-my8TuQ5Rm9EA7iKlSwKU3vkmwNd-O2z28hFtVUrULWF6FuQjj605GxcDWzf72FqlzJuB7zSecmO1LTFWueRr-4r6u6bfsNLC6O_txHlMykwFtOmjNQx4JMeGIs2KfRsuORC__-CS8Ydx9Cls10SdO6C5eECEAq3s1p-ohcq4cEd8N7dhiw8sCsuemf3xREVoZeVTYKLRH6dWHAIGIeRI_oQLtFKChRK9LpVZc8gnqg5yzj9oOk4',
    },
    {
      name: 'Julian Vane',
      role: 'Lab Technician',
      bio: 'Managing hardware maintenance and high-voltage power distribution systems.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEkihfXj1nPdwqAPCelUiidmGjDJdtDMhZViQWbW6SUbNUzGTrJsluJSKwfWEqvbwGbzHXQI0fIp7GpRwE4URCzjedDeEcUbpAUfGZX-JtYWnZxQV_-_ec5NEYk1c83TSJIsTZ6uW76KI4mMEncxamiYxKdGZfPQM0snZW7pkF81LT72UN70wZ4LT6gsDnblzL9htmr_3QPLirLlDiTqrMNoi1P-oLjslZIlRKX2Khf36N19sFzJ0rl1y6wH2oBlZTH_hD1oroqwc',
    },
  ];
}
