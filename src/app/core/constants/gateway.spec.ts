import { describe, expect, it } from 'vitest';
import { resolveGatewayUrl, GATEWAY_PORT } from './gateway';

describe('resolveGatewayUrl', () => {
  it('builds http URL from hostname and default port', () => {
    expect(resolveGatewayUrl('10.211.14.115')).toBe('http://10.211.14.115:3000');
  });

  it('uses GATEWAY_PORT by default', () => {
    expect(GATEWAY_PORT).toBe(3000);
    expect(resolveGatewayUrl('192.168.1.10')).toBe(`http://192.168.1.10:${GATEWAY_PORT}`);
  });

  it('allows an explicit port override', () => {
    expect(resolveGatewayUrl('localhost', 3001)).toBe('http://localhost:3001');
  });
});
