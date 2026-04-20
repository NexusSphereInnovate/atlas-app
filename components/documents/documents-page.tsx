"use client";

import { useMemo, useState } from "react";
import DocumentsUploader from "@/components/documents/documents-uploader";
import DocumentsList from "@/components/documents/documents-list";
import type { UserRole } from "@/types/atlas";

export default function DocumentsPage({ role, orgId }: { role: UserRole; orgId: string }) {
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const canPickClient = useMemo(() => role === "admin" || role === "agent", [role]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[22px] sm:text-[28px] font-extrabold text-[#eef1f6] tracking-[-0.8px]">Documents</div>
        <div className="mt-1 text-[13px] text-white/40">
          Upload, preview, téléchargement. {canPickClient ? "Vous pouvez choisir un client." : "Vous gérez vos documents."}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-5">
        <DocumentsUploader
          role={role}
          orgId={orgId}
          onUploaded={() => setRefreshKey((k) => k + 1)}
        />

        <DocumentsList
          key={refreshKey}
          role={role}
          orgId={orgId}
        />
      </div>
    </div>
  );
}