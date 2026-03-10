/**
 * @what Breadcrumb コンポーネントのユニットテスト
 * @why リンク付き/リンクなし項目、セパレーター、アクセシビリティを検証
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '../Breadcrumb';

// next/link is mocked to avoid Next.js router dependency in tests
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Breadcrumb', () => {
  describe('rendering', () => {
    it('should render a single item without separator', () => {
      render(<Breadcrumb items={[{ label: 'ホーム' }]} />);

      expect(screen.getByText('ホーム')).toBeDefined();
      expect(screen.queryByRole('img', { hidden: true })).toBeNull();
    });

    it('should render multiple items with separators', () => {
      render(
        <Breadcrumb
          items={[
            { label: 'ホーム', href: '/' },
            { label: '企業一覧', href: '/companies' },
            { label: '企業詳細' },
          ]}
        />
      );

      expect(screen.getByText('ホーム')).toBeDefined();
      expect(screen.getByText('企業一覧')).toBeDefined();
      expect(screen.getByText('企業詳細')).toBeDefined();
    });
  });

  describe('linked items', () => {
    it('should render item with href as a link', () => {
      render(<Breadcrumb items={[{ label: 'ホーム', href: '/' }, { label: '現在ページ' }]} />);

      const link = screen.getByRole('link', { name: 'ホーム' });
      expect(link).toBeDefined();
      expect(link.getAttribute('href')).toBe('/');
    });

    it('should render multiple linked items', () => {
      render(
        <Breadcrumb
          items={[
            { label: 'ホーム', href: '/' },
            { label: '企業一覧', href: '/companies' },
            { label: '現在ページ' },
          ]}
        />
      );

      const links = screen.getAllByRole('link');
      expect(links.length).toBe(2);
      expect(links[0].getAttribute('href')).toBe('/');
      expect(links[1].getAttribute('href')).toBe('/companies');
    });
  });

  describe('current page item (no href)', () => {
    it('should render item without href as a span', () => {
      render(<Breadcrumb items={[{ label: 'ホーム', href: '/' }, { label: '現在ページ' }]} />);

      const currentItem = screen.getByText('現在ページ');
      expect(currentItem.tagName.toLowerCase()).toBe('span');
    });

    it('should mark the item without href with aria-current="page"', () => {
      render(<Breadcrumb items={[{ label: 'ホーム', href: '/' }, { label: '現在ページ' }]} />);

      const currentItem = screen.getByText('現在ページ');
      expect(currentItem.getAttribute('aria-current')).toBe('page');
    });

    it('should not add aria-current to linked items', () => {
      render(<Breadcrumb items={[{ label: 'ホーム', href: '/' }, { label: '現在ページ' }]} />);

      const link = screen.getByRole('link', { name: 'ホーム' });
      expect(link.getAttribute('aria-current')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should render a nav element with default aria-label', () => {
      render(<Breadcrumb items={[{ label: 'ホーム' }]} />);

      const nav = screen.getByRole('navigation', { name: 'パンくずリスト' });
      expect(nav).toBeDefined();
    });

    it('should render a nav element with custom aria-label', () => {
      render(<Breadcrumb items={[{ label: 'ホーム' }]} ariaLabel="ナビゲーション" />);

      const nav = screen.getByRole('navigation', { name: 'ナビゲーション' });
      expect(nav).toBeDefined();
    });

    it('should render items inside an ordered list', () => {
      render(<Breadcrumb items={[{ label: 'ホーム', href: '/' }, { label: '現在ページ' }]} />);

      const list = screen.getByRole('list');
      expect(list.tagName.toLowerCase()).toBe('ol');
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBe(2);
    });
  });

  describe('empty items', () => {
    it('should render an empty nav when no items are provided', () => {
      render(<Breadcrumb items={[]} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeDefined();
      const listItems = screen.queryAllByRole('listitem');
      expect(listItems.length).toBe(0);
    });
  });
});
