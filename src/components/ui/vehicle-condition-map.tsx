"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
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
  front_bumper: "M112 52 Q180 32 248 52 L238 79 Q180 67 122 79 Z",
  hood: "M126 86 Q180 70 234 86 L224 181 Q180 163 136 181 Z",
  left_front_fender: "M118 88 L135 183 L111 221 L72 202 Q75 127 105 93 Z",
  right_front_fender: "M242 88 L225 183 L249 221 L288 202 Q285 127 255 93 Z",
  left_front_door: "M109 227 L137 190 L133 292 L101 305 L79 265 L82 240 Z",
  right_front_door: "M251 227 L223 190 L227 292 L259 305 L281 265 L278 240 Z",
  left_rear_door: "M101 313 L133 300 L130 398 L110 431 L76 405 L82 336 Z",
  right_rear_door: "M259 313 L227 300 L230 398 L250 431 L284 405 L278 336 Z",
  left_rear_fender: "M75 413 L110 438 L127 493 L107 526 L77 508 Q67 464 69 434 Z",
  right_rear_fender: "M285 413 L250 438 L233 493 L253 526 L283 508 Q293 464 291 434 Z",
  roof: "M144 188 Q180 170 216 188 L224 396 Q180 414 136 396 Z",
  trunk: "M129 405 Q180 421 231 405 L239 496 Q180 514 121 496 Z",
  rear_bumper: "M112 505 Q180 523 248 505 L254 534 Q180 554 106 534 Z",
};

const conditionColors: Record<VehicleConditionStatus, string> = {
  original: "#aeb8c7",
  local_paint: "#e4a11b",
  painted: "#2673d9",
  replaced: "#dd3344",
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
  const [activeStatus, setActiveStatus] = useState<VehicleConditionStatus>("local_paint");
  const changedCount = Object.keys(condition).length;

  function applyStatus(partId: VehicleBodyPartId) {
    if (readOnly || !onChange) return;
    const next = { ...condition };
    if (activeStatus === "original") delete next[partId];
    else next[partId] = activeStatus;
    onChange(next);
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
        <span>Kaporta durumu</span>
        <strong>{changedCount === 0 ? "Tüm parçalar orijinal" : `${changedCount} işlemli parça`}</strong>
      </div>

      {!readOnly ? (
        <fieldset className="vehicle-condition-toolbar">
          <legend>Uygulanacak durum</legend>
          <div className="vehicle-condition-statuses">
            {VEHICLE_CONDITION_STATUSES.map((status) => (
              <label key={status.value} data-status={status.value} data-active={activeStatus === status.value || undefined}>
                <input
                  className="sr-only"
                  type="radio"
                  name="vehicle-condition-status"
                  value={status.value}
                  checked={activeStatus === status.value}
                  onChange={() => setActiveStatus(status.value)}
                />
                <span aria-hidden="true" />
                {status.label}
              </label>
            ))}
          </div>
          {changedCount > 0 ? (
            <button type="button" className="vehicle-condition-reset" onClick={() => onChange?.({})}>
              <RotateCcw size={14} aria-hidden="true" /> Tümünü orijinal yap
            </button>
          ) : null}
        </fieldset>
      ) : (
        <div className="vehicle-condition-legend" aria-label="Kaporta durum renkleri">
          {VEHICLE_CONDITION_STATUSES.map((status) => (
            <span key={status.value} data-status={status.value}><i aria-hidden="true" />{status.label}</span>
          ))}
        </div>
      )}

      <div className="vehicle-condition-layout">
        <div className="vehicle-map-canvas">
          <span className="vehicle-map-direction vehicle-map-direction-front">Ön</span>
          <svg
            className="vehicle-map-svg"
            viewBox="0 0 360 580"
            role={readOnly ? "img" : "group"}
            aria-label="Üstten araç kaporta ekspertiz şeması"
          >
            <path
              className="vehicle-map-shell"
              d="M180 22 C244 22 286 64 299 122 L306 201 L296 234 L301 405 C300 472 277 533 236 552 Q180 570 124 552 C83 533 60 472 59 405 L64 234 L54 201 L61 122 C74 64 116 22 180 22 Z"
              fill={compact ? "#eef1f5" : undefined}
              stroke={compact ? "#8f9bad" : undefined}
            />
            <rect className="vehicle-map-wheel" x="48" y="150" width="19" height="82" rx="7" fill={compact ? "#252b36" : undefined} />
            <rect className="vehicle-map-wheel" x="293" y="150" width="19" height="82" rx="7" fill={compact ? "#252b36" : undefined} />
            <rect className="vehicle-map-wheel" x="48" y="407" width="19" height="82" rx="7" fill={compact ? "#252b36" : undefined} />
            <rect className="vehicle-map-wheel" x="293" y="407" width="19" height="82" rx="7" fill={compact ? "#252b36" : undefined} />
            {VEHICLE_BODY_PARTS.map((part) => {
              const status = getVehicleConditionStatus(condition, part.id);
              return (
                <path
                  key={part.id}
                  className="vehicle-map-part"
                  data-status={status}
                  d={partGeometry[part.id]}
                  fill={compact ? conditionColors[status] : undefined}
                  stroke={compact ? "#f7f8fa" : undefined}
                  role={readOnly ? undefined : "button"}
                  tabIndex={readOnly ? undefined : 0}
                  aria-label={readOnly ? undefined : `${part.label}: ${getVehicleConditionLabel(status)}. ${getVehicleConditionLabel(activeStatus)} olarak işaretle`}
                  onClick={() => applyStatus(part.id)}
                  onKeyDown={(event) => handlePartKeyDown(event, part.id)}
                >
                  <title>{`${part.label}: ${getVehicleConditionLabel(status)}`}</title>
                </path>
              );
            })}
            <path
              className="vehicle-map-window"
              d="M145 191 Q180 176 215 191 L219 282 Q180 270 141 282 Z"
              fill={compact ? "#c7ccd5" : undefined}
              stroke={compact ? "#8994a5" : undefined}
            />
            <path
              className="vehicle-map-window"
              d="M141 303 Q180 290 219 303 L221 390 Q180 404 139 390 Z"
              fill={compact ? "#c7ccd5" : undefined}
              stroke={compact ? "#8994a5" : undefined}
            />
          </svg>
          <span className="vehicle-map-direction vehicle-map-direction-rear">Arka</span>
        </div>

        <div className="vehicle-part-list" aria-label="Kaporta parçaları">
          {VEHICLE_BODY_PARTS.filter((part) => !compact || getVehicleConditionStatus(condition, part.id) !== "original").map((part) => {
            const status = getVehicleConditionStatus(condition, part.id);
            const content = (
              <>
                <span className="vehicle-part-name">{part.label}</span>
                <span className="vehicle-part-status" data-status={status}>
                  <i aria-hidden="true" />{getVehicleConditionLabel(status)}
                </span>
              </>
            );

            return readOnly ? (
              <div key={part.id} className="vehicle-part-row">{content}</div>
            ) : (
              <button
                key={part.id}
                type="button"
                className="vehicle-part-row"
                onClick={() => applyStatus(part.id)}
                aria-label={`${part.label}, mevcut durum ${getVehicleConditionLabel(status)}. ${getVehicleConditionLabel(activeStatus)} olarak işaretle`}
              >
                {content}
              </button>
            );
          })}
          {compact && changedCount === 0 ? (
            <div className="vehicle-part-empty">İşlemli kaporta parçası bulunmuyor.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
