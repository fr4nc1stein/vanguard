"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import Pagination from "../../components/Pagination";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: string;
  createdAt: number;
  lastSignInAt: number | null;
  imageUrl: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  TRIAGER: "bg-purple-100 text-purple-700 border-purple-200",
  USER: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ userId: string; newRole: string; userName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchUsers();
  }, []);

  // Search and filter logic
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const displayName = getUserDisplayName(user).toLowerCase();
    return (
      displayName.includes(query) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query)) ||
      user.role.toLowerCase().includes(query)
    );
  });

  // Sorting logic
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    // Special handling for display name
    if (sortField === 'firstName') {
      aVal = getUserDisplayName(a);
      bVal = getUserDisplayName(b);
    }
    
    // Handle null values
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Handle sort column click
  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Sort icon component
  const SortIcon = ({ field }: { field: keyof User }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('[fetchUsers]', err);
      setToast({ message: 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }

      // Refresh users list
      await fetchUsers();
      setToast({ message: `User role updated to ${newRole}`, type: 'success' });
    } catch (err: unknown) {
      console.error('[updateUserRole]', err);
      setToast({ message: err instanceof Error ? err.message : 'Failed to update role', type: 'error' });
    } finally {
      setUpdating(null);
    }
  }

  function getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.username) return user.username;
    if (user.email) return user.email;
    return 'Unknown User';
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">👥 User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage platform users and assign roles</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Search Bar */}
        {!loading && users.length > 0 && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, username, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <p className="text-xs text-gray-500 mt-2">
                Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Admins</p>
            <p className="text-2xl font-bold text-red-700">{users.filter(u => u.role === 'ADMIN').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Triagers</p>
            <p className="text-2xl font-bold text-purple-700">{users.filter(u => u.role === 'TRIAGER').length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Researchers</p>
            <p className="text-2xl font-bold text-gray-700">{users.filter(u => u.role === 'USER').length}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-sm font-medium">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('firstName')}>
                      User <SortIcon field="firstName" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>
                      Email <SortIcon field="email" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('role')}>
                      Role <SortIcon field="role" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                      Joined <SortIcon field="createdAt" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lastSignInAt')}>
                      Last Sign In <SortIcon field="lastSignInAt" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.imageUrl}
                            alt={getUserDisplayName(user)}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{getUserDisplayName(user)}</p>
                            {user.username && <p className="text-xs text-gray-400">@{user.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${ROLE_COLORS[user.role] || ROLE_COLORS.USER}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.role === 'USER' && (
                            <button
                              onClick={() => setConfirmDialog({ userId: user.id, newRole: 'TRIAGER', userName: getUserDisplayName(user) })}
                              disabled={updating === user.id}
                              className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              {updating === user.id ? 'Updating...' : 'Promote to Triager'}
                            </button>
                          )}
                          {user.role === 'TRIAGER' && (
                            <>
                              <button
                                onClick={() => updateUserRole(user.id, 'ADMIN')}
                                disabled={updating === user.id}
                                className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                Promote to Admin
                              </button>
                              <button
                                onClick={() => updateUserRole(user.id, 'USER')}
                                disabled={updating === user.id}
                                className="px-3 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                              >
                                Demote
                              </button>
                            </>
                          )}
                          {user.role === 'ADMIN' && (
                            <span className="text-xs text-gray-500 italic">Manage in Clerk</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={sortedUsers.length}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">ℹ️ Role Hierarchy</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>USER:</strong> Can submit reports and view own submissions</li>
            <li><strong>TRIAGER:</strong> Can triage reports, change status, adjust severity</li>
            <li><strong>ADMIN:</strong> Full platform access including user management and settings</li>
          </ul>
        </div>
      </div>

      <SiteFooter />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title="Promote to Triager"
          message={`Are you sure you want to promote ${confirmDialog.userName} to TRIAGER role? This will grant them access to triage reports and change statuses.`}
          type="warning"
          onConfirm={() => {
            updateUserRole(confirmDialog.userId, confirmDialog.newRole);
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </main>
  );
}
