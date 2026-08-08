// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { LanShareService } from './lan-share.service';

describe('LanShareService', () => {
  let service: LanShareService;

  beforeEach(() => {
    localStorage.clear();
    service = new LanShareService();
  });

  it('opens modal and marks shown on first admin visit', () => {
    expect(service.hasShown()).toBe(false);
    service.maybeShowOnFirstAdminVisit();
    expect(service.modalOpen()).toBe(true);
    expect(service.hasShown()).toBe(true);
  });

  it('does not reopen automatically on a later admin visit', () => {
    service.maybeShowOnFirstAdminVisit();
    service.closeModal();
    expect(service.modalOpen()).toBe(false);
    service.maybeShowOnFirstAdminVisit();
    expect(service.modalOpen()).toBe(false);
    expect(service.hasShown()).toBe(true);
  });

  it('openModal reopens without clearing the shown flag', () => {
    service.maybeShowOnFirstAdminVisit();
    service.closeModal();
    service.openModal();
    expect(service.modalOpen()).toBe(true);
    expect(service.hasShown()).toBe(true);
  });

  it('closeModal marks shown even if mark was skipped', () => {
    service.openModal();
    localStorage.removeItem(LanShareService.STORAGE_KEY);
    service.closeModal();
    expect(service.modalOpen()).toBe(false);
    expect(service.hasShown()).toBe(true);
  });
});
