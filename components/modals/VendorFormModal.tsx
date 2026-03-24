"use client";

import { useState } from "react";
import type { Vendor } from "@/lib/supabase/types";

interface Props {
  vendor?: Vendor | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VendorFormModal({ vendor, onClose, onSuccess }: Props) {
  const isEdit = !!vendor;

  const [name, setName] = useState(vendor?.name ?? "");
  const [contactName, setContactName] = useState(vendor?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(vendor?.contact_email ?? "");
  const [website, setWebsite] = useState(vendor?.website ?? "");
  const [defaultLeadDays, setDefaultLeadDays] = useState(
    vendor?.default_lead_days?.toString() ?? ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    const body = {
      name: name.trim(),
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      website: website.trim() || null,
      default_lead_days: defaultLeadDays ? Number(defaultLeadDays) : null,
    };

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/vendors/${vendor!.id}` : "/api/vendors";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save vendor");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-bicr-navy">
            {isEdit ? "Edit Vendor" : "Add Vendor"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vendor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="Vendor name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="Contact person"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="vendor@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Default Lead Days
            </label>
            <input
              type="number"
              min="0"
              value={defaultLeadDays}
              onChange={(e) => setDefaultLeadDays(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bicr-teal"
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-md bg-bicr-teal text-white hover:bg-bicr-navy transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
