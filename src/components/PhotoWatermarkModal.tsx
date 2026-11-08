import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  ExternalLink,
  X,
  RefreshCw,
  Upload,
  LogOut,
  Building2,
  ArrowLeftRight,
} from 'lucide-react';
import { BranchType, FUTARI_HQ_ADDRESS } from '../utils/futariLogic';

interface ActiveCheckInSummary {
  checkInTime: string;
  mode: 'WFO' | 'WFE';
  photoDataUrl?: string;
  locationWatermark?: string;
}

interface PhotoWatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  role: string;
  branch: BranchType;
  selectedMode: 'WFO' | 'WFE';
  onSelectMode?: (mode: 'WFO' | 'WFE') => void;
  checkInTime: string;
  initialPreviewObjectUrl?: string;
  initialFileName?: string;
  initialFile?: File | null;
  isSubmitting?: boolean;
  errorMessage?: string;
  activeCheckIn?: ActiveCheckInSummary | null;
  onTriggerClockOut?: () => void;
  onToggleHybridMode?: () => void;
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
  onSelectMode,
  checkInTime,
  initialPreviewObjectUrl = '',
  initialFileName = '',
  initialFile = null,
  isSubmitting = false,
  errorMessage = '',
  activeCheckIn = null,
  onTriggerClockOut,
  onToggleHybridMode,
  onConfirmCapture,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isGroundingMaps, setIsGroundingMaps] = useState(false);
  const [isCameraStreaming, setIsCameraStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');

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

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraStreaming(false);
  }, []);

  const startFrontCamera = useCallback(async () => {
    setCameraError('');
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      return;
    }
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setIsCameraStreaming(false);
      setCameraError(
        'Kamera depan tidak dapat diakses otomatis. Silakan izinkan akses kamera di browser atau pilih file foto di bawah.'
      );
    }
  }, [stopCameraStream]);

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

  // Attach stream to video element whenever isCameraStreaming becomes true
  useEffect(() => {
    if (isCameraStreaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraStreaming]);

  // Automatically start front camera (`facingMode: 'user'`) when modal opens and user is not yet checked in
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }
    if (!activeCheckIn && !initialPreviewObjectUrl && !initialFile) {
      startFrontCamera();
    }
    return () => {
      stopCameraStream();
    };
  }, [
    isOpen,
    activeCheckIn,
    initialPreviewObjectUrl,
    initialFile,
    startFrontCamera,
    stopCameraStream,
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCameraStream();
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setUploadedObjectUrl(objectUrl);
    setUploadedFileName(file.name);
    setPhotoDataUrl(objectUrl);
  };

  const drawWatermarkedOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    addressText: string
  ) => {
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

    drawWatermarkedOverlay(ctx, w, h, addressText);

    if (!uploadedObjectUrl) {
      setPhotoDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const captureFrameFromVideo = async (): Promise<{
    file: File | null;
    dataUrl: string;
  }> => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) {
      return { file: selectedFile, dataUrl: uploadedObjectUrl || photoDataUrl };
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file: selectedFile, dataUrl: uploadedObjectUrl || photoDataUrl };
    }

    const w = canvas.width;
    const h = canvas.height;

    if (video && isCameraStreaming && video.readyState >= 2) {
      // Mirror front camera horizontally so selfie looks natural
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
      drawWatermarkedOverlay(ctx, w, h, locationWatermark);
    } else {
      drawWatermarkedPhoto(locationWatermark);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    );
    const fileName = `selfie-${selectedMode.toLowerCase()}-${Date.now()}.jpg`;
    const file = blob
      ? new File([blob], fileName, { type: 'image/jpeg' })
      : selectedFile;

    stopCameraStream();
    if (file) {
      setSelectedFile(file);
      setUploadedFileName(fileName);
    }
    setUploadedObjectUrl(dataUrl);
    setPhotoDataUrl(dataUrl);

    return { file, dataUrl };
  };

  const handleRetakeCamera = () => {
    setUploadedObjectUrl('');
    setUploadedFileName('');
    setSelectedFile(null);
    startFrontCamera();
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
        if (
          Array.isArray(data.groundingLinks) &&
          data.groundingLinks.length > 0
        ) {
          setMapsLinks(data.groundingLinks);
        }
        if (
          Array.isArray(data.reviewSnippets) &&
          data.reviewSnippets.length > 0
        ) {
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
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#00B4D8]" />
            <h3
              id="photo-watermark-title"
              className="text-base sm:text-lg font-semibold text-white"
            >
              {activeCheckIn
                ? 'Status Kehadiran & Quick Check-Out'
                : 'Quick Camera Check-In (WFO / WFE)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            aria-label="Close Photo Modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Check-In Banner if user has already checked in today (including from another device) */}
        {activeCheckIn ? (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sudah Check-In Hari Ini</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeCheckIn.mode} · {activeCheckIn.checkInTime} WIB
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Data kehadiran Anda hari ini sudah tersinkronisasi di database
                Supabase. Anda dapat melakukan transisi lokasi (WFO ↔ WFE) atau
                langsung melakukan Clock-Out (Pulang) dari perangkat ini.
              </p>
              {activeCheckIn.photoDataUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img
                    src={activeCheckIn.photoDataUrl}
                    alt="Foto Check-In Hari Ini"
                    className="w-full h-48 object-cover block"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              {onToggleHybridMode && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleHybridMode();
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {activeCheckIn.mode === 'WFO'
                      ? 'Pindah ke WFE (Event)'
                      : 'Kembali ke WFO (Kantor)'}
                  </span>
                </button>
              )}
              {onTriggerClockOut && (
                <button
                  type="button"
                  data-testid="modal-quick-clock-out-btn"
                  onClick={() => {
                    stopCameraStream();
                    onClose();
                    onTriggerClockOut();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-orange-500 hover:opacity-95 flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Photo Check-Out / Clock-Out Sekarang</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* WFO / WFE Mode Selector directly inside Quick Camera Modal */}
            {onSelectMode && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onSelectMode('WFO')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    selectedMode === 'WFO'
                      ? 'border-[#00B4D8] bg-[#0277BD]/25 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#00B4D8]" />
                  <span>WFO (Office HQ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectMode('WFE')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    selectedMode === 'WFE'
                      ? 'border-[#00B4D8] bg-[#0277BD]/25 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>WFE (Event Venue)</span>
                </button>
              </div>
            )}

            {/* Live Front Camera Viewfinder OR Captured/Uploaded Preview */}
            <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
              {isCameraStreaming && !uploadedObjectUrl ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    data-testid="live-front-camera-video"
                    className="w-full h-60 object-cover block scale-x-[-1]"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 border border-[#00B4D8]/40 text-[11px] font-mono font-bold text-[#00B4D8] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>LIVE FRONT CAM · {selectedMode}</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-3 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-200 truncate">
                      <p className="font-mono font-bold text-[#00B4D8]">
                        {checkInTime} WIB · {staffName}
                      </p>
                      <p className="text-slate-300 truncate">
                        {locationWatermark}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="capture-live-camera-btn"
                      onClick={() => {
                        void captureFrameFromVideo();
                      }}
                      className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 shadow-lg flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Ambil Foto</span>
                    </button>
                  </div>
                </div>
              ) : uploadedObjectUrl ? (
                <div className="relative">
                  <img
                    src={uploadedObjectUrl}
                    alt="Real Uploaded Check-In Preview"
                    data-testid="checkin-modal-real-photo-preview"
                    className="w-full h-60 object-cover block"
                  />
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={handleRetakeCamera}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 text-xs font-medium text-[#00B4D8] border border-[#00B4D8]/40 flex items-center gap-1.5 shadow"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Foto Ulang</span>
                    </button>
                  </div>
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
                className={
                  isCameraStreaming || uploadedObjectUrl
                    ? 'hidden'
                    : 'w-full h-auto block'
                }
              />
            </div>

            {cameraError && !uploadedObjectUrl && (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-300 flex items-center justify-between gap-2">
                <span>{cameraError}</span>
                <button
                  type="button"
                  onClick={() => void startFrontCamera()}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Fallback HTML5 Camera / File Input (<input type="file" accept="image/*" capture="user" />) */}
            <div className="p-3.5 rounded-xl border border-[#00B4D8]/40 bg-slate-950/90 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="modal-checkin-file-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#00B4D8] cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Atau Pilih / Upload File Foto:</span>
                </label>
                {!isCameraStreaming && (
                  <button
                    type="button"
                    onClick={handleRetakeCamera}
                    className="text-[11px] font-semibold text-[#00B4D8] hover:underline flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Buka Kamera Depan</span>
                  </button>
                )}
              </div>
              {uploadedFileName && (
                <p className="font-mono text-[11px] text-emerald-400 truncate">
                  File terpilih: {uploadedFileName}
                </p>
              )}
              <input
                id="modal-checkin-file-input"
                data-testid="modal-checkin-file-input"
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0277BD] file:text-white hover:file:bg-[#00B4D8] cursor-pointer"
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
                    className={`w-3.5 h-3.5 ${
                      isGroundingMaps ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Refresh GPS Grounding</span>
                </button>
              </div>

              <div className="flex items-start gap-1.5 text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-[#00B4D8] shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{locationWatermark}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {reviewSnippet}
                  </p>
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
                onClick={() => {
                  stopCameraStream();
                  onClose();
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="confirm-checkin-photo-btn"
                disabled={isSubmitting}
                onClick={async () => {
                  if (isCameraStreaming && !selectedFile) {
                    const captured = await captureFrameFromVideo();
                    onConfirmCapture({
                      file: captured.file,
                      photoDataUrl: captured.dataUrl,
                      locationWatermark,
                      mapsLinks,
                    });
                    return;
                  }
                  onConfirmCapture({
                    file: selectedFile,
                    photoDataUrl: uploadedObjectUrl || photoDataUrl,
                    locationWatermark,
                    mapsLinks,
                  });
                }}
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
                    <span>
                      Simpan Foto &amp; Konfirmasi Check-In ({selectedMode})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
