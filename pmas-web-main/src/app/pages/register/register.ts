import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface EnrollmentStep {
  label: string;
  desc: string;
}

interface Role {
  value: string;
  label: string;
}

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
})
export class Register {
  fullName = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  role = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);

  enrollmentSteps: EnrollmentStep[] = [
    { label: 'Submit Profile', desc: 'Fill in your credentials and research role.' },
    { label: 'Director Review', desc: 'Lab Director validates your institutional affiliation.' },
    { label: 'Clearance Token', desc: 'Receive your access token via institutional email.' },
    { label: 'Module Assignment', desc: 'Get assigned to your designated research modules.' },
  ];

  roles: Role[] = [
    { value: 'faculty', label: 'Faculty / Lead Researcher' },
    { value: 'phd', label: 'PhD Candidate' },
    { value: 'engineer', label: 'Lead Engineer' },
    { value: 'undergrad', label: 'Undergrad Assistant' },
    { value: 'technician', label: 'Lab Technician' },
    { value: 'external', label: 'External Collaborator' },
  ];

  get passwordsMatch(): boolean {
    return this.password() === this.confirmPassword() || this.confirmPassword() === '';
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const p = this.password();
    if (!p) return null;
    if (p.length < 8) return 'weak';
    if (p.length < 12 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return 'medium';
    return 'strong';
  }

  handleSubmit() {
    if (!this.passwordsMatch) return;
    this.isLoading.set(true);
    setTimeout(() => this.isLoading.set(false), 1500);
  }
}
