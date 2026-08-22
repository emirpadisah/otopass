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
  front_bumper: "M128 42 Q121 42 121 49 L121 67 Q121 74 128 74 H232 Q239 74 239 67 V49 Q239 42 232 42 Z M135 53 H157 L165 63 H134 Z M203 53 H226 L226 63 H195 Z",
  hood: "M132 86 Q180 67 228 86 Q234 88 235 96 L226 166 Q180 149 134 166 L125 96 Q126 88 132 86 Z",
  left_front_fender: "M48 95 H73 L79 121 L70 135 H48 Z",
  right_front_fender: "M312 95 H287 L281 121 L290 135 H312 Z",
  left_front_door: "M48 153 Q59 158 68 151 L117 224 H48 Z",
  right_front_door: "M312 153 Q301 158 292 151 L243 224 H312 Z",
  left_rear_door: "M48 229 H117 V275 L76 292 H48 Z",
  right_rear_door: "M312 229 H243 V275 L284 292 H312 Z",
  left_rear_fender: "M48 284 L76 292 Q70 302 78 311 L74 334 H48 Z",
  right_rear_fender: "M312 284 L284 292 Q290 302 282 311 L286 334 H312 Z",
  roof: "M139 229 H221 L219 287 H141 Z",
  trunk: "M128 300 Q180 315 232 300 L239 332 Q180 350 121 332 Z",
  rear_bumper: "M127 347 Q121 347 121 354 V371 Q121 378 128 378 H232 Q239 378 239 371 V354 Q239 347 232 347 Z M135 356 H157 L161 368 H135 Z M203 356 H225 V368 H199 Z",
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
              viewBox="0 0 360 420"
              role={readOnly ? "img" : "group"}
              aria-label="Üstten araç kaporta ekspertiz şeması"
            >
              <g className="vehicle-map-guide" aria-hidden="true">
                <rect x="137" y="20" width="20" height="8" rx="2" />
                <rect x="203" y="20" width="20" height="8" rx="2" />
                <rect x="137" y="396" width="20" height="8" rx="2" />
                <rect x="203" y="396" width="20" height="8" rx="2" />
              </g>
              <path className="vehicle-map-shadow" d="M87 101 L123 88 L138 166 L130 227 L119 292 L101 337 H78 L92 288 L101 226 L82 139 Z" />
              <path className="vehicle-map-shadow" d="M273 101 L237 88 L222 166 L230 227 L241 292 L259 337 H282 L268 288 L259 226 L278 139 Z" />
              <path className="vehicle-map-window" d="M134 166 Q180 148 226 166 L216 218 H144 Z" />
              <path className="vehicle-map-window" d="M141 287 H219 L230 300 Q180 314 130 300 Z" />
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
                <circle cx="48" cy="142" r="21" />
                <circle cx="312" cy="142" r="21" />
                <circle cx="48" cy="285" r="21" />
                <circle cx="312" cy="285" r="21" />
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
