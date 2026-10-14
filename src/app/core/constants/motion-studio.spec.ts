import { describe, expect, it } from 'vitest';
import { resolveMotionStudioUrl, MOTION_STUDIO_PORT } from './motion-studio';

describe('resolveMotionStudioUrl', () => {
  it('builds http URL from hostname and default port', () => {
    expect(resolveMotionStudioUrl('10.211.14.115')).toBe('http://10.211.14.115:4210');
  });

  it('uses MOTION_STUDIO_PORT by default', () => {
    expect(MOTION_STUDIO_PORT).toBe(4210);
  });
});
