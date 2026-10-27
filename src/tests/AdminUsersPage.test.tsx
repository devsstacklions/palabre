import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from '../pages/AdminUsersPage';

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getPendingAdminAccessRequests: vi.fn(),
  reviewAdminAccessRequest: vi.fn(),
}));

vi.mock('../services/admin.service', () => ({
  adminService: {
    getUsers: mocks.getUsers,
    getPendingAdminAccessRequests: mocks.getPendingAdminAccessRequests,
    reviewAdminAccessRequest: mocks.reviewAdminAccessRequest,
  },
}));

describe('AdminUsersPage access requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUsers.mockResolvedValue({ users: [], total: 0 });
    mocks.getPendingAdminAccessRequests.mockResolvedValue([
      {
        id: 'request-1',
        user_id: 'user-1',
        created_at: '2026-10-25T10:00:00.000Z',
        display_name: 'Nouveau candidat',
        username: 'candidat',
      },
    ]);
    mocks.reviewAdminAccessRequest.mockResolvedValue(undefined);
  });

  it('approuve une demande depuis la console admin', async () => {
    render(<AdminUsersPage />);

    expect(await screen.findByText('Nouveau candidat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approuver/i }));

    await waitFor(() => {
      expect(mocks.reviewAdminAccessRequest).toHaveBeenCalledWith('request-1', 'approved');
      expect(mocks.getPendingAdminAccessRequests).toHaveBeenCalledTimes(2);
    });
  });
});
