"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

export default function ExportButton({ targetRef, fileName }: { targetRef: React.RefObject<HTMLDivElement | null>; fileName: string }) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    if (!targetRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(targetRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert("No se pudo exportar la imagen. Prueba de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
    >
      {busy ? "Generando…" : "Exportar como foto PNG"}
    </button>
  );
}
