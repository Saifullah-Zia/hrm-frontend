"use client";

import { useQuery } from "@tanstack/react-query";
import { announcementApi, AnnouncementDTO } from "@/services/announcementApi";

export default function EmployeeAnnouncementsPage() {
  const query = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: () => announcementApi.getActive(),
  });

  const items = query.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Announcements</h1>
        <p className="text-white/40 text-sm mt-1">Company updates published for all staff.</p>
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-rose-400 text-sm">Could not load announcements.</p>
      ) : items.length === 0 ? (
        <p className="text-white/40 text-sm">No active announcements right now.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((a: AnnouncementDTO) => (
            <li
              key={a.id}
              className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-white/90">{a.title}</h2>
              <p className="text-xs text-white/35 mt-1">
                {a.createdAt
                  ? new Date(a.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : ""}
                {a.createdBy ? ` · ${a.createdBy}` : ""}
              </p>
              <p className="text-white/60 text-sm mt-4 whitespace-pre-wrap leading-relaxed">{a.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
