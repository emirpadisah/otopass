"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Download, Maximize2, X } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type ApplicationPhotoGalleryProps = {
  photos: string[];
  downloadUrls?: string[];
  vehicleLabel: string;
};

function getPhotoLabel(vehicleLabel: string, index: number) {
  return `${vehicleLabel} - ${index + 1}. fotoğraf`;
}

export function ApplicationPhotoGallery({ photos, downloadUrls = [], vehicleLabel }: ApplicationPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const swipeStartRef = useRef<{ pointerId: number; x: number } | null>(null);
  const suppressExpandRef = useRef(false);
  const activePhoto = photos[activeIndex] ?? photos[0];
  const activeDownloadUrl = downloadUrls[activeIndex];

  if (!activePhoto) return null;

  const selectRelative = (offset: number) => {
    setActiveIndex((current) => (current + offset + photos.length) % photos.length);
  };

  const openFullscreenViewer = () => setDialogOpen(true);

  const beginSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (photos.length < 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
    if ((event.target as HTMLElement).closest(".ops-photo-nav, .ops-photo-dialog-nav, .ops-photo-expand")) return;
    swipeStartRef.current = { pointerId: event.pointerId, x: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishSwipe = (event: ReactPointerEvent<HTMLElement>, suppressExpand: boolean) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    const distance = event.clientX - start.x;
    if (Math.abs(distance) < 48) {
      if (suppressExpand) setDialogOpen(true);
      return;
    }
    if (suppressExpand) {
      suppressExpandRef.current = true;
      window.setTimeout(() => { suppressExpandRef.current = false; }, 0);
    }
    selectRelative(distance > 0 ? -1 : 1);
  };

  return (
    <>
      <div className="ops-photo-gallery">
        <div
          className="ops-photo-stage"
          role="group"
          aria-roledescription="carousel"
          aria-label={`${vehicleLabel} fotoğrafları`}
          onPointerDown={beginSwipe}
          onPointerUp={(event) => finishSwipe(event, true)}
          onPointerCancel={() => { swipeStartRef.current = null; }}
        >
          <button
            type="button"
            className="ops-photo-main"
            onClick={() => {
              if (suppressExpandRef.current) return;
              openFullscreenViewer();
            }}
            aria-label={`${getPhotoLabel(vehicleLabel, activeIndex)} büyüt`}
          >
            <Image
              key={activePhoto}
              src={activePhoto}
              alt={getPhotoLabel(vehicleLabel, activeIndex)}
              fill
              sizes="(max-width: 900px) 100vw, 70vw"
              className="ops-photo-image"
              unoptimized
              priority
              draggable={false}
            />
          </button>

          <button
            type="button"
            className="ops-photo-expand"
            aria-label={`${getPhotoLabel(vehicleLabel, activeIndex)} tam ekran görüntüle`}
            title="Tam ekran görüntüle"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              openFullscreenViewer();
            }}
          >
            <Maximize2 size={17} aria-hidden="true" />
          </button>

          <span className="ops-photo-counter" aria-live="polite">
            {String(activeIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
          </span>

          {activeDownloadUrl ? (
            <a
              className="ops-photo-download"
              href={activeDownloadUrl}
              download
              aria-label={`${getPhotoLabel(vehicleLabel, activeIndex)} indir`}
              title="Fotoğrafı indir"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <Download size={17} aria-hidden="true" />
            </a>
          ) : null}

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="ops-photo-nav"
                data-direction="previous"
                onClick={() => selectRelative(-1)}
                aria-label="Önceki fotoğraf"
                title="Önceki fotoğraf"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ops-photo-nav"
                data-direction="next"
                onClick={() => selectRelative(1)}
                aria-label="Sonraki fotoğraf"
                title="Sonraki fotoğraf"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>

        {photos.length > 1 ? (
          <div className="ops-photo-thumbnails ui-scrollbar" aria-label="Araç fotoğrafları">
            {photos.map((photo, index) => (
              <button
                key={photo}
                type="button"
                className="ops-photo-thumbnail"
                data-active={index === activeIndex ? "true" : "false"}
                onClick={() => setActiveIndex(index)}
                aria-label={`${index + 1}. fotoğrafı göster`}
                aria-pressed={index === activeIndex}
              >
                <Image
                  src={photo}
                  alt=""
                  fill
                  sizes="110px"
                  className="object-cover"
                  unoptimized
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="ops-photo-dialog-overlay" />
          <Dialog.Content
            className="ops-photo-dialog"
            aria-describedby={undefined}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" && photos.length > 1) selectRelative(-1);
              if (event.key === "ArrowRight" && photos.length > 1) selectRelative(1);
            }}
          >
            <div className="ops-photo-dialog-toolbar">
              <div>
                <Dialog.Title>{vehicleLabel}</Dialog.Title>
                <span>{activeIndex + 1} / {photos.length}</span>
              </div>
              <div className="ops-photo-dialog-actions">
                {activeDownloadUrl ? (
                  <a className="ops-photo-dialog-download" href={activeDownloadUrl} download>
                    <Download size={17} aria-hidden="true" />
                    Fotoğrafı indir
                  </a>
                ) : null}
                <Dialog.Close className="ops-photo-dialog-close" aria-label="Fotoğraf görüntüleyiciyi kapat" title="Kapat">
                  <X size={20} aria-hidden="true" />
                </Dialog.Close>
              </div>
            </div>

            <div
              className="ops-photo-dialog-canvas"
              role="group"
              aria-roledescription="carousel"
              aria-label={`${vehicleLabel} tam ekran fotoğrafları`}
              onPointerDown={beginSwipe}
              onPointerUp={(event) => finishSwipe(event, false)}
              onPointerCancel={() => { swipeStartRef.current = null; }}
            >
              <Image
                key={`dialog-${activePhoto}`}
                src={activePhoto}
                alt={getPhotoLabel(vehicleLabel, activeIndex)}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized
                priority
                draggable={false}
              />
              {photos.length > 1 ? (
                <>
                  <button type="button" className="ops-photo-dialog-nav" data-direction="previous" onClick={() => selectRelative(-1)} aria-label="Önceki fotoğraf">
                    <ChevronLeft size={24} aria-hidden="true" />
                  </button>
                  <button type="button" className="ops-photo-dialog-nav" data-direction="next" onClick={() => selectRelative(1)} aria-label="Sonraki fotoğraf">
                    <ChevronRight size={24} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
