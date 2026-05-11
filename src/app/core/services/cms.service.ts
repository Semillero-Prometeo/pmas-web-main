import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  HomeContent,
  CmsProject,
  CmsMember,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateMemberPayload,
  UpdateMemberPayload,
} from '../models/cms.models';

// Rutas a los JSON estáticos en public/data/
const DATA_HOME = 'data/home.json';
const DATA_PROJECTS = 'data/projects.json';
const DATA_MEMBERS = 'data/members.json';

@Injectable({ providedIn: 'root' })
export class CmsService {
  private readonly http = inject(HttpClient);

  // ── Home ─────────────────────────────────────────────────

  getHome(): Observable<HomeContent | null> {
    return this.http.get<HomeContent>(DATA_HOME).pipe(catchError(() => of(null)));
  }

  // El panel admin descarga el JSON actualizado — no necesita backend
  upsertHome(payload: Omit<HomeContent, 'id' | 'created_at' | 'updated_at'>): Observable<HomeContent> {
    this.downloadJson(payload, 'home.json');
    return of(payload as HomeContent);
  }

  // ── Projects ──────────────────────────────────────────────

  getProjects(): Observable<CmsProject[]> {
    return this.http.get<CmsProject[]>(DATA_PROJECTS).pipe(catchError(() => of([])));
  }

  createProject(payload: CreateProjectPayload): Observable<CmsProject> {
    return this.getProjects().pipe(
      map((projects) => {
        const newProject: CmsProject = {
          ...payload,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.downloadJson([...projects, newProject], 'projects.json');
        return newProject;
      }),
    );
  }

  updateProject(id: string, payload: UpdateProjectPayload): Observable<CmsProject> {
    return this.getProjects().pipe(
      map((projects) => {
        const updated = projects.map((p) =>
          p.id === id ? { ...p, ...payload, updated_at: new Date().toISOString() } : p,
        );
        this.downloadJson(updated, 'projects.json');
        return updated.find((p) => p.id === id)!;
      }),
    );
  }

  deleteProject(id: string): Observable<void> {
    return this.getProjects().pipe(
      map((projects) => {
        this.downloadJson(projects.filter((p) => p.id !== id), 'projects.json');
      }),
    );
  }

  // ── Members ───────────────────────────────────────────────

  getMembers(): Observable<CmsMember[]> {
    return this.http.get<CmsMember[]>(DATA_MEMBERS).pipe(catchError(() => of([])));
  }

  createMember(payload: CreateMemberPayload): Observable<CmsMember> {
    return this.getMembers().pipe(
      map((members) => {
        const newMember: CmsMember = {
          ...payload,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.downloadJson([...members, newMember], 'members.json');
        return newMember;
      }),
    );
  }

  updateMember(id: string, payload: UpdateMemberPayload): Observable<CmsMember> {
    return this.getMembers().pipe(
      map((members) => {
        const updated = members.map((m) =>
          m.id === id ? { ...m, ...payload, updated_at: new Date().toISOString() } : m,
        );
        this.downloadJson(updated, 'members.json');
        return updated.find((m) => m.id === id)!;
      }),
    );
  }

  deleteMember(id: string): Observable<void> {
    return this.getMembers().pipe(
      map((members) => {
        this.downloadJson(members.filter((m) => m.id !== id), 'members.json');
      }),
    );
  }

  /** Descarga el JSON actualizado para reemplazar el archivo en public/data/ */
  private downloadJson(data: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Convierte un File a base64 string */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
