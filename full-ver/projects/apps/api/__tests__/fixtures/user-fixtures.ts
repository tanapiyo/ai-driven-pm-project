/**
 * @what User entity test fixtures
 * @why Provide reusable test data for User domain tests
 */

import { Email } from '@monorepo/shared';
import { UserId } from '../../src/domain/user/user.js';

export const userFixtures = {
  /**
   * Valid user parameters for User.create()
   */
  validCreateParams: () => ({
    id: new UserId('550e8400-e29b-41d4-a716-446655440000'),
    email: Email.create('test@example.com'),
    name: 'Test User',
    causationId: 'causation-1',
    correlationId: 'correlation-1',
  }),

  /**
   * Valid user parameters with custom email
   */
  withEmail: (email: string) => ({
    ...userFixtures.validCreateParams(),
    email: Email.create(email),
  }),

  /**
   * Valid user parameters with custom name
   */
  withName: (name: string) => ({
    ...userFixtures.validCreateParams(),
    name,
  }),

  /**
   * Valid user parameters with custom ID
   */
  withId: (id: string) => ({
    ...userFixtures.validCreateParams(),
    id: new UserId(id),
  }),

  /**
   * Multiple user IDs for testing collections
   */
  userIds: {
    user1: '550e8400-e29b-41d4-a716-446655440000',
    user2: '660e8400-e29b-41d4-a716-446655440001',
    user3: '770e8400-e29b-41d4-a716-446655440002',
    admin: '880e8400-e29b-41d4-a716-446655440003',
  },

  /**
   * Multiple emails for testing
   */
  emails: {
    valid1: 'user1@example.com',
    valid2: 'user2@example.com',
    admin: 'admin@example.com',
  },

  /**
   * Edge case names for boundary testing
   */
  names: {
    minLength: 'A',
    maxLength: 'a'.repeat(100),
    tooLong: 'a'.repeat(101),
    empty: '',
    normal: 'Test User',
  },

  /**
   * Command metadata for event testing
   */
  metadata: {
    default: {
      causationId: 'causation-1',
      correlationId: 'correlation-1',
    },
    custom: (causationId: string, correlationId: string) => ({
      causationId,
      correlationId,
    }),
  },
};
