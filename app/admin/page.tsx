"use client";
import React from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function AdminManagement() {
  return (
    <main className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚙️ Admin Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Platform configuration and user management</p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Management */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
                👥
              </div>
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manage platform users, assign roles (TRIAGER, ADMIN), and view user activity.
            </p>
            <Link
              href="/admin/users"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Users →
            </Link>
          </div>

          {/* Scope Management */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">
                🎯
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Scope Management</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Define in-scope targets, manage allowed vulnerability types, and set exclusions.
            </p>
            <Link
              href="/admin/scope"
              className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Manage Scope →
            </Link>
          </div>

          {/* Report Templates */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
                📝
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Report Templates</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Create reusable response templates for common triage scenarios and communications.
            </p>
            <Link
              href="/admin/templates"
              className="inline-block px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Manage Templates →
            </Link>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">
                📊
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              View platform metrics, trend analysis, and export compliance reports.
            </p>
            <Link
              href="/admin/analytics"
              className="inline-block px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              View Analytics →
            </Link>
          </div>

          {/* Hall of Fame */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-xl">
                🏆
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Hall of Fame</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manage leaderboard, configure points per severity, and view researcher recognition.
            </p>
            <Link
              href="/admin/hall-of-fame"
              className="inline-block px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Manage Hall of Fame →
            </Link>
          </div>

          {/* Activity Logs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
                📋
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Activity Logs</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Track all platform activities, admin actions, and security events.
            </p>
            <Link
              href="/admin/activity-logs"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Logs →
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📚 Documentation</h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              For detailed information about admin features, see{" "}
              <code className="bg-white px-2 py-0.5 rounded text-blue-700 font-mono text-xs">
                docs/ADMIN_FEATURES.md
              </code>
            </p>
            <p className="text-gray-600">
              Features are being implemented in phases. Check the roadmap for timeline and priorities.
            </p>
          </div>
        </div>

        {/* Back to Triage */}
        <div className="text-center">
          <Link
            href="/triage"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Back to Triage Dashboard
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
