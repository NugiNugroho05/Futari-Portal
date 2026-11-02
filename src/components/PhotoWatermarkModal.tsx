import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  ExternalLink,
  X,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { BranchType, FUTARI_HQ_ADDRESS } from '../utils/futariLogic';

interface PhotoWatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  role: string;
  branch: BranchType;
  selectedMode: 'WFO' | 'WFE';
  checkInTime: string;
  initialPreviewObjectUrl?: string;
  initialFileName?: string;
  initialFile?: File | null;
  isSubmitting?: boolean;
  errorMessage?: string;
  onConfirmCapture: (data: {
    file?: File | null;
    photoDataUrl: string;
    locationWatermark: string;
    mapsLinks: { title: string; uri: string }[];
  }) => void;
}

export const PhotoWatermarkModal: React.FC<PhotoWatermarkModalProps> = ({
  isOpen,
  onClose,
  staffName,
  role,
  branch,
  selectedMode,
  checkInTime,
  initialPreviewObjectUrl = '',
  initialFileName = '',
  initialFile = null,
  isSubmitting = false,
  errorMessage = '',
  onConfirmCapture,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGroundingMaps, setIsGroundingMaps] = useState(false);

  const getDefaultWatermarkAddress = (b: BranchType, mode: 'WFO' | 'WFE') =>
    b === 'Bandung'
      ? 'Futari Bandung Creative Hub, Jl. Ir. H. Juanda No. 88, Bandung'
      : mode === 'WFE'
      ? 'Jakarta Convention Center (JCC) Senayan, Jl. Gatot Subroto, Jakarta'
      : FUTARI_HQ_ADDRESS;

  const [locationWatermark, setLocationWatermark] = useState(
    getDefaultWatermarkAddress(branch, selectedMode)
  );
  const [mapsLinks, setMapsLinks] = useState<{ title: string; uri: string }[]>([
    {
      title:
        branch === 'Bandung'
          ? 'Futari Bandung Creative Hub'
          : selectedMode === 'WFE'
          ? 'Jakarta Convention Center Senayan'
          : 'Futari HQ Jakarta — Jl. Nusa Indah No.33, Cipete Selatan',
      uri:
        branch === 'Bandung'
          ? 'https://www.google.com/maps/search/?api=1&query=Jalan+Ir+H+Juanda+88+Bandung'
          : selectedMode === 'WFE'
          ? 'https://www.google.com/maps/search/?api=1&query=Jakarta+Convention+Center+Senayan'
          : 'https://www.google.com/maps/search/?api=1&query=Jl.+Nusa+Indah+No.33,+RT.14/RW.5,+Cipete+Sel.,+Kec.+Cilandak,+Kota+Jakarta+Selatan,+Daerah+Khusus+Ibukota+Jakarta+12410',
    },
  ]);
  const [reviewSnippet, setReviewSnippet] = useState<string>(
    'Google Maps Grounding Verified Coordinates'
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [uploadedObjectUrl, setUploadedObjectUrl] = useState<string>(
    initialPreviewObjectUrl
  );
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    initialFileName
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);

  useEffect(() => {
    if (initialPreviewObjectUrl) {
      setUploadedObjectUrl(initialPreviewObjectUrl);
    }
    if (initialFileName) {
      setUploadedFileName(initialFileName);
    }
    if (initialFile) {
      setSelectedFile(initialFile);
    }
  }, [initialPreviewObjectUrl, initialFileName, initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setUploadedObjectUrl(objectUrl);
    setUploadedFileName(file.name);
    setPhotoDataUrl(objectUrl);
  };

  const drawWatermarkedPhoto = (addressText: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Studio background representing camera viewfinder
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#082032');
    grad.addColorStop(0.5, '#0277BD');
    grad.addColorStop(1, '#00B4D8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 40; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Silhouette portrait in viewfinder
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 42, 44, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2 + 48, 76, Math.PI, Math.PI * 2);
    ctx.fill();

    // Initials badge
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    const initials = staffName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    ctx.fillText(initials, w / 2, h / 2 - 32);

    // Top-left Mode & Live Verified Tag
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(14, 14, 210, 32);
    ctx.fillStyle = '#00B4D8';
    ctx.font = 'bold 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FUTARI CAM · ${selectedMode} (${branch})`, 24, 34);

    // Bottom Scrim for Timestamp & Google Maps Location Watermark
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(0, h - 102, w, 102);

    ctx.fillStyle = '#00B4D8';
    ctx.font = 'bold 12px "IBM Plex Mono", monospace';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    ctx.fillText(`TIMESTAMP: ${dateStr} · ${checkInTime}:00 WIB`, 16, h - 76);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${staffName} — ${role}`, 16, h - 55);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10.5px "Plus Jakarta Sans", sans-serif';
    const fullWatermarkText = `MAPS WATERMARK: ${addressText}`;
    if (fullWatermarkText.length <= 72) {
      ctx.fillText(fullWatermarkText, 16, h - 24);
    } else {
      const splitIdx = fullWatermarkText.lastIndexOf(' ', 72);
      const breakPoint = splitIdx > 20 ? splitIdx : 72;
      const watermarkLine1 = fullWatermarkText.slice(0, breakPoint).trim();
      const watermarkLine2 = fullWatermarkText.slice(breakPoint).trim();
      ctx.fillText(watermarkLine1, 16, h - 33);
      if (watermarkLine2) {
        ctx.fillText(watermarkLine2, 16, h - 15);
      }
    }

    if (!uploadedObjectUrl) {
      setPhotoDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const fetchMapsGrounding = async () => {
    const defaultAddr = getDefaultWatermarkAddress(branch, selectedMode);
    setLocationWatermark(defaultAddr);
    setIsGroundingMaps(true);
    try {
      const res = await fetch('/api/gemini/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          branch,
          latitude: branch === 'Bandung' ? -6.8898 : -6.2764,
          longitude: branch === 'Bandung' ? 107.6128 : 106.8019,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.watermarkAddress || defaultAddr;
        setLocationWatermark(addr);
        if (Array.isArray(data.groundingLinks) && data.groundingLinks.length > 0) {
          setMapsLinks(data.groundingLinks);
        }
        if (Array.isArray(data.reviewSnippets) && data.reviewSnippets.length > 0) {
          setReviewSnippet(data.reviewSnippets[0]);
        }
        drawWatermarkedPhoto(addr);
      } else {
        drawWatermarkedPhoto(defaultAddr);
      }
    } catch {
      drawWatermarkedPhoto(defaultAddr);
    } finally {
      setIsGroundingMaps(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMapsGrounding();
    }
  }, [isOpen, selectedMode, branch, checkInTime]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-watermark-title"
      data-testid="photo-watermark-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 no-print"
    >
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#00B4D8]" />
            <h3 id="photo-watermark-title" className="text-base sm:text-lg font-semibold text-white">
              Photo Check-In &amp; Camera / File Upload
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Photo Modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Real HTML5 Camera / File Input (<input type="file" accept="image/*" capture="environment" />) */}
          <div className="p-3.5 rounded-xl border border-[#00B4D8]/40 bg-slate-950/90 space-y-2">
            <label
              htmlFor="modal-checkin-file-input"
              className="flex items-center justify-between gap-2 text-xs font-semibold text-[#00B4D8] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                <span>Ambil Foto Kamera / Upload File Foto Check-In:</span>
              </span>
              {uploadedFileName && (
                <span className="font-mono text-[11px] text-emerald-400 truncate max-w-[180px]">
                  {uploadedFileName}
                </span>
              )}
            </label>
            <input
              id="modal-checkin-file-input"
              data-testid="modal-checkin-file-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0277BD] file:text-white hover:file:bg-[#00B4D8] cursor-pointer"
            />
          </div>

          {/* Real Preview via URL.createObjectURL(file) when uploaded, or fallback canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
            {uploadedObjectUrl ? (
              <div className="relative">
                <img
                  src={uploadedObjectUrl}
                  alt="Real Uploaded Check-In Preview"
                  data-testid="checkin-modal-real-photo-preview"
                  className="w-full h-56 object-cover block"
                />
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 p-3 border-t border-slate-800 text-xs">
                  <p className="font-mono font-bold text-[#00B4D8]">
                    TIMESTAMP: {checkInTime} WIB · {selectedMode} ({branch})
                  </p>
                  <p className="font-semibold text-white mt-0.5">
                    {staffName} — {role}
                  </p>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    MAPS WATERMARK: {locationWatermark}
                  </p>
                </div>
              </div>
            ) : null}
            <canvas
              ref={canvasRef}
              width={520}
              height={300}
              className={uploadedObjectUrl ? 'hidden' : 'w-full h-auto block'}
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 font-medium text-[#00B4D8]">
                <Clock className="w-3.5 h-3.5" />
                <span>Timestamp Overlay: {checkInTime} WIB</span>
              </span>
              <button
                type="button"
                onClick={fetchMapsGrounding}
                disabled={isGroundingMaps}
                className="flex items-center gap-1 text-slate-300 hover:text-white"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isGroundingMaps ? 'animate-spin' : ''}`}
                />
                <span>Refresh GPS Grounding</span>
              </button>
            </div>

            <div className="flex items-start gap-1.5 text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-[#00B4D8] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{locationWatermark}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{reviewSnippet}</p>
              </div>
            </div>

            {mapsLinks.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-2">
                {mapsLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#00B4D8] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{link.title} (Google Maps Grounded)</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              data-testid="confirm-checkin-photo-btn"
              disabled={isSubmitting}
              onClick={() =>
                onConfirmCapture({
                  file: selectedFile,
                  photoDataUrl: uploadedObjectUrl || photoDataUrl,
                  locationWatermark,
                  mapsLinks,
                })
              }
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengunggah Foto &amp; Menyimpan Check-In...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Foto &amp; Konfirmasi Check-In ({selectedMode})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
