"use client";

import { DEFAULT_EMERGENCY_CONTACTS } from "@/lib/purbalingga";

export default function EmergencyBar() {
  return (
    <section className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            DARURAT 24 JAM
          </span>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            Kontak Darurat Kabupaten Purbalingga
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Untuk kejadian mendesak, segera hubungi nomor di bawah ini:
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEFAULT_EMERGENCY_CONTACTS.map((item) => {
          const telHref = `tel:${item.phone_number.replace(/[^0-9+]/g, "")}`;
          return (
            <a
              key={item.id}
              href={telHref}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-red-500 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="pr-2">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {item.category}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.agency_name}
                </p>
                {item.address && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.address}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                {item.phone_number}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
