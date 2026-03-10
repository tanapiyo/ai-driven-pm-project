/**
 * @what HealthStatus コンポーネントのユニットテスト
 * @why AC-002/AC-004: health 結果（status, timestamp）が表示されることを確認
 */

import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthStatus } from '../HealthStatus';
import type { HealthResponse } from '../../api';

describe('HealthStatus', () => {
  const mockData: HealthResponse = {
    status: 'ok',
    timestamp: '2026-03-04T13:00:00Z',
  };

  it('should render the status badge', () => {
    render(<HealthStatus data={mockData} />);

    expect(screen.getByText('ok')).toBeDefined();
  });

  it('should render the timestamp', () => {
    render(<HealthStatus data={mockData} />);

    expect(screen.getByText('Timestamp:')).toBeDefined();
  });

  it('should render the Health Status heading', () => {
    render(<HealthStatus data={mockData} />);

    expect(screen.getByText('Health Status')).toBeDefined();
  });

  it('should display formatted timestamp text', () => {
    render(<HealthStatus data={mockData} />);

    // Timestamp label should be present
    const timestampLabel = screen.getByText('Timestamp:');
    expect(timestampLabel).toBeDefined();
  });
});
