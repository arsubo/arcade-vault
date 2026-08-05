"use client";

import { SKIN_IDS, SKIN_META, type SkinId } from "@/lib/skins";

export default function SkinPicker({
  skin,
  onChange,
}: {
  skin: SkinId;
  onChange: (skin: SkinId) => void;
}) {
  return (
    <div className="skin-picker" role="group" aria-label="Estilo visual">
      <span className="label">SKIN</span>
      {SKIN_IDS.map((id) => {
        const meta = SKIN_META[id];
        const active = id === skin;
        return (
          <button
            key={id}
            type="button"
            className="swatch"
            aria-pressed={active}
            onClick={() => onChange(id)}
          >
            <span
              className="dot"
              style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}` }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
