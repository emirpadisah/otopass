"use client";

import { Check, ChevronRight, ClipboardCheck, FileCheck2, RotateCcw, ScanLine } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import {
  VEHICLE_BODY_PARTS,
  VEHICLE_CONDITION_STATUSES,
  getVehicleConditionLabel,
  getVehicleConditionStatus,
  normalizeVehicleBodyCondition,
  type VehicleBodyCondition,
  type VehicleBodyPartId,
  type VehicleConditionStatus,
} from "@/lib/vehicle-condition";

const partGeometry: Record<VehicleBodyPartId, string> = {
  front_bumper: "M131 38 Q124 38 124 45 L124 63 Q124 70 131 70 H229 Q236 70 236 63 V45 Q236 38 229 38 Z M138 49 H157 L164 59 H137 Z M203 49 H223 V59 H196 Z",
  hood: "M136 86 Q180 68 224 86 Q230 88 231 96 L224 151 Q180 136 136 151 L129 96 Q130 88 136 86 Z",
  left_front_fender: "M58 93 H80 L84 116 L74 126 H58 Z",
  right_front_fender: "M302 93 H280 L276 116 L286 126 H302 Z",
  left_front_door: "M58 169 H76 L111 219 H58 Z",
  right_front_door: "M302 169 H284 L249 219 H302 Z",
  left_rear_door: "M58 236 H111 V270 L76 283 H58 Z",
  right_rear_door: "M302 236 H249 V270 L284 283 H302 Z",
  left_rear_fender: "M58 310 L76 296 L84 315 L80 339 H58 Z",
  right_rear_fender: "M302 310 L284 296 L276 315 L280 339 H302 Z",
  roof: "M142 171 Q180 157 218 171 L216 283 Q180 296 144 283 Z",
  trunk: "M132 307 Q180 320 228 307 L235 335 Q180 351 125 335 Z",
  rear_bumper: "M130 365 Q124 365 124 372 V387 Q124 394 131 394 H229 Q236 394 236 387 V372 Q236 365 229 365 Z M138 374 H157 L161 384 H138 Z M203 374 H222 V384 H199 Z",
};

const conditionColors: Record<VehicleConditionStatus, string> = {
  original: "#e6e9ed",
  local_paint: "#ff9d32",
  painted: "#4389cc",
  replaced: "#ff4b55",
};

const statusDescriptions: Record<VehicleConditionStatus, string> = {
  original: "İşlem yok",
  local_paint: "Bölgesel işlem",
  painted: "Tam boya",
  replaced: "Parça değişimi",
};

type VehicleConditionMapProps = {
  value?: VehicleBodyCondition | unknown;
  onChange?: (value: VehicleBodyCondition) => void;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
};

export function VehicleConditionMap({ value, onChange, readOnly = false, compact = false, className }: VehicleConditionMapProps) {
  const condition = normalizeVehicleBodyCondition(value);
  const statusGroupName = useId();
  const [activeStatus, setActiveStatus] = useState<VehicleConditionStatus>("local_paint");
  const [selectedPart, setSelectedPart] = useState<VehicleBodyPartId | null>(null);
  const changedCount = Object.keys(condition).length;
  const selectedPartConfig = VEHICLE_BODY_PARTS.find((part) => part.id === selectedPart);
  const visibleParts = VEHICLE_BODY_PARTS.filter(
    (part) => !compact || getVehicleConditionStatus(condition, part.id) !== "original",
  );
  const statusCounts = VEHICLE_CONDITION_STATUSES.reduce<Record<VehicleConditionStatus, number>>(
    (counts, status) => {
      counts[status.value] = VEHICLE_BODY_PARTS.filter(
        (part) => getVehicleConditionStatus(condition, part.id) === status.value,
      ).length;
      return counts;
    },
    { original: 0, local_paint: 0, painted: 0, replaced: 0 },
  );

  function applyStatus(partId: VehicleBodyPartId) {
    if (readOnly || !onChange) return;
    setSelectedPart(partId);
    const next = { ...condition };
    if (activeStatus === "original") delete next[partId];
    else next[partId] = activeStatus;
    onChange(next);
  }

  function resetCondition() {
    setSelectedPart(null);
    onChange?.({});
  }

  function handlePartKeyDown(event: React.KeyboardEvent<SVGPathElement>, partId: VehicleBodyPartId) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    applyStatus(partId);
  }

  return (
    <div
      className={cn("vehicle-condition", className)}
      data-read-only={readOnly || undefined}
      data-compact={compact || undefined}
    >
      <div className="vehicle-condition-summary" aria-live="polite">
        <div className="vehicle-condition-summary-title">
          <span className="vehicle-condition-summary-icon" aria-hidden="true">
            <ScanLine size={17} strokeWidth={1.8} />
          </span>
          <div>
            <span>Ekspertiz özeti</span>
            <strong>{changedCount === 0 ? "Tüm parçalar orijinal" : `${changedCount} parçada işlem var`}</strong>
          </div>
        </div>
        <div className="vehicle-condition-score">
          <span>İşlemli parça</span>
          <strong>{changedCount}<small> / {VEHICLE_BODY_PARTS.length}</small></strong>
        </div>
      </div>

      <div className="vehicle-condition-metrics" aria-label="Kaporta durum dağılımı">
        {VEHICLE_CONDITION_STATUSES.map((status) => (
          <div key={status.value} data-status={status.value}>
            <span><i aria-hidden="true" />{status.label}</span>
            <strong>{statusCounts[status.value]}</strong>
          </div>
        ))}
      </div>

      {!readOnly ? (
        <fieldset className="vehicle-condition-toolbar">
          <legend className="sr-only">Parçaya uygulanacak durum</legend>
          <div className="vehicle-condition-toolbar-heading">
            <span>Parçaya uygulanacak durum</span>
            {changedCount > 0 ? (
              <button type="button" className="vehicle-condition-reset" onClick={resetCondition}>
                <RotateCcw size={14} aria-hidden="true" /> Tümünü sıfırla
              </button>
            ) : null}
          </div>
          <div className="vehicle-condition-statuses">
            {VEHICLE_CONDITION_STATUSES.map((status) => (
              <label key={status.value} data-status={status.value} data-active={activeStatus === status.value || undefined}>
                <input
                  className="sr-only"
                  type="radio"
                  name={statusGroupName}
                  value={status.value}
                  checked={activeStatus === status.value}
                  onChange={() => setActiveStatus(status.value)}
                />
                <span className="vehicle-condition-status-swatch" aria-hidden="true" />
                <span className="vehicle-condition-status-copy">
                  <strong>{status.label}</strong>
                  <small>{statusDescriptions[status.value]}</small>
                </span>
                <Check className="vehicle-condition-status-check" size={15} strokeWidth={2.4} aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="vehicle-condition-layout">
        <section className="vehicle-map-panel" aria-label="Araç kaporta şeması">
          <header className="vehicle-condition-panel-heading">
            <div>
              <span>Üst görünüm</span>
              <strong>{selectedPartConfig?.label ?? "Araç kaporta şeması"}</strong>
            </div>
            {!readOnly ? (
              <span className="vehicle-condition-active-mode" data-status={activeStatus}>
                <i aria-hidden="true" />{getVehicleConditionLabel(activeStatus)} modu
              </span>
            ) : (
              <span className="vehicle-condition-panel-count">13 parça</span>
            )}
          </header>

          <div className="vehicle-map-canvas">
            <span className="vehicle-map-direction vehicle-map-direction-front"><i aria-hidden="true" />Ön</span>
            <svg
              className="vehicle-map-svg"
              viewBox="0 0 360 440"
              role={readOnly ? "img" : "group"}
              aria-label="Üstten araç kaporta ekspertiz şeması"
            >
              <g className="vehicle-map-guide" aria-hidden="true">
                <rect x="137" y="20" width="20" height="8" rx="2" />
                <rect x="203" y="20" width="20" height="8" rx="2" />
                <rect x="137" y="414" width="20" height="8" rx="2" />
                <rect x="203" y="414" width="20" height="8" rx="2" />
              </g>
              {VEHICLE_BODY_PARTS.map((part) => {
                const status = getVehicleConditionStatus(condition, part.id);
                return (
                  <path
                    key={part.id}
                    className="vehicle-map-part"
                    data-status={status}
                    data-selected={selectedPart === part.id || undefined}
                    d={partGeometry[part.id]}
                    fillRule="evenodd"
                    clipRule="evenodd"
                    fill={compact ? conditionColors[status] : undefined}
                    stroke={compact ? "#ffffff" : undefined}
                    role={readOnly ? undefined : "button"}
                    tabIndex={readOnly ? undefined : 0}
                    aria-pressed={readOnly ? undefined : selectedPart === part.id}
                    aria-label={readOnly ? undefined : `${part.label}: ${getVehicleConditionLabel(status)}. ${getVehicleConditionLabel(activeStatus)} olarak işaretle`}
                    onClick={() => applyStatus(part.id)}
                    onKeyDown={(event) => handlePartKeyDown(event, part.id)}
                  >
                    <title>{`${part.label}: ${getVehicleConditionLabel(status)}`}</title>
                  </path>
                );
              })}
              <g className="vehicle-map-wheels" aria-hidden="true">
                <circle cx="28" cy="143" r="19" />
                <circle cx="332" cy="143" r="19" />
                <circle cx="28" cy="287" r="19" />
                <circle cx="332" cy="287" r="19" />
              </g>
            </svg>
            <span className="vehicle-map-direction vehicle-map-direction-rear">Arka</span>
          </div>
        </section>

        <section className="vehicle-part-panel" aria-label="Kaporta parça raporu">
          <header className="vehicle-condition-panel-heading vehicle-part-panel-heading">
            <div className="vehicle-part-panel-title">
              <span className="vehicle-part-panel-icon" aria-hidden="true">
                <ClipboardCheck size={17} strokeWidth={1.8} />
              </span>
              <span className="vehicle-part-panel-copy">
                <small>Parça bazlı analiz</small>
                <strong>{compact ? "İşlemli parçalar" : "Kaporta durum raporu"}</strong>
              </span>
            </div>
            <span className="vehicle-part-panel-count">
              <FileCheck2 size={14} strokeWidth={1.8} aria-hidden="true" />
              <span>
                <small>{compact ? "İşlemli" : "Kapsam"}</small>
                <strong>{compact ? changedCount : VEHICLE_BODY_PARTS.length}<i> / {VEHICLE_BODY_PARTS.length}</i></strong>
              </span>
            </span>
          </header>
          <div className="vehicle-part-list" aria-label="Kaporta parçaları">
            {visibleParts.map((part) => {
              const status = getVehicleConditionStatus(condition, part.id);
              const partNumber = VEHICLE_BODY_PARTS.findIndex((item) => item.id === part.id) + 1;
              const content = (
                <>
                  <span className="vehicle-part-index" aria-hidden="true">{String(partNumber).padStart(2, "0")}</span>
                  <span className="vehicle-part-name">{part.label}</span>
                  <span className="vehicle-part-status" data-status={status}>
                    <i aria-hidden="true" />{getVehicleConditionLabel(status)}
                  </span>
                  {!readOnly ? <ChevronRight className="vehicle-part-action" size={15} aria-hidden="true" /> : null}
                </>
              );

              return readOnly ? (
                <div key={part.id} className="vehicle-part-row" data-status={status} data-selected={selectedPart === part.id || undefined}>{content}</div>
              ) : (
                <button
                  key={part.id}
                  type="button"
                  className="vehicle-part-row"
                  data-status={status}
                  data-selected={selectedPart === part.id || undefined}
                  onClick={() => applyStatus(part.id)}
                  aria-pressed={selectedPart === part.id}
                  aria-label={`${part.label}, mevcut durum ${getVehicleConditionLabel(status)}. ${getVehicleConditionLabel(activeStatus)} olarak işaretle`}
                >
                  {content}
                </button>
              );
            })}
            {compact && changedCount === 0 ? (
              <div className="vehicle-part-empty">
                <Check size={18} aria-hidden="true" />
                İşlemli kaporta parçası bulunmuyor.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
