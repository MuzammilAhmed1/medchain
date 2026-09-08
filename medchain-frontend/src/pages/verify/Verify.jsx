import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, QrCode, Camera, Upload, StopCircle } from "lucide-react";
import jsQR from "jsqr";
import { PageHeader, Card, CardHeader, Input, Button, Timeline, Badge, Alert } from "../../components/ui";
import { verifyApi } from "../../services/verifyApi";

export default function Verify() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null); // { found, authentic, batch }
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(false);

  const doVerify = useCallback(async (batchId) => {
    const cleanId = batchId.trim().toUpperCase();
    if (!cleanId) return;
    setLoading(true);
    setError("");
    try {
      const response = await verifyApi.verify(cleanId);
      setResult(response);
      setChecked(true);
    } catch (err) {
      setError(err.message || "Could not verify this batch.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const param = searchParams.get("query") || searchParams.get("batchId");
    if (param) {
      setQuery(param);
      doVerify(param);
    }
  }, [searchParams, doVerify]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    doVerify(query);
  };

  // Helper to decode QR from image data with resolution downscaling for high-res images
  const decodeImage = (img) => {
    const canvas = document.createElement("canvas");
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    // Scale down if image is larger than 1200px to speed up jsQR and avoid memory limits
    const maxDim = 1200;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    // Try standard scan
    let code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    return code?.data ? code.data.trim() : null;
  };

  // Upload and decode QR Code from image file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setCameraError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const decoded = decodeImage(img);
        if (decoded) {
          setQuery(decoded);
          doVerify(decoded);
        } else {
          setError(
            "Could not detect a QR code in this image. Please ensure the QR code is clearly visible, in focus, and well-lit."
          );
        }
      };
      img.onerror = () => {
        setError("Could not load the selected image file.");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanningCamera(false);
  }, []);

  const scanFrame = useCallback(() => {
    function step() {
      if (!isScanningRef.current) return;

      const video = videoRef.current;
      if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            const found = code.data.trim();
            stopCamera();
            setQuery(found);
            doVerify(found);
            return;
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(step);
    }

    step();
  }, [doVerify, stopCamera]);

  const startCamera = async () => {
    setCameraError("");
    setError("");

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is not supported in this browser or environment. Please use 'Upload QR Image' or enter the Batch ID manually."
      );
      return;
    }

    try {
      // First try environment (back) camera; if that fails or is unsupported (e.g. desktop webcam), fall back to basic video
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      isScanningRef.current = true;
      setIsScanningCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      stopCamera();
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera permissions in your browser or upload an image.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device was found on this computer. Please use 'Upload QR Image' instead.");
      } else {
        setCameraError(`Camera error: ${err.message || "Unable to access video stream. Please upload an image."}`);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div>
      <PageHeader
        title="Verify medicine"
        description="Enter a batch ID, upload a QR code image, or scan with camera to confirm authenticity."
      />

      <Card className="mb-6">
        <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="e.g. MC-2026-00001 or MEDCHAIN:BATCH:MC-2026-00001"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="sm:w-auto" disabled={loading}>
            {loading ? "Checking…" : "Verify"}
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5"
          >
            <Upload size={16} />
            Upload QR Image
          </Button>

          {!isScanningCamera ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={startCamera}
              className="flex items-center gap-1.5"
            >
              <Camera size={16} />
              Scan with Camera
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={stopCamera}
              className="flex items-center gap-1.5"
            >
              <StopCircle size={16} />
              Stop Camera
            </Button>
          )}
        </div>

        {cameraError && (
          <div className="mt-4">
            <Alert tone="warning">{cameraError}</Alert>
          </div>
        )}

        {/* Video element is permanently mounted to avoid null ref issues */}
        <div className={isScanningCamera ? "mt-4 flex flex-col items-center" : "hidden"}>
          <div className="relative w-full max-w-sm rounded-md overflow-hidden border-2 border-primary aspect-square bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-8 border-2 border-dashed border-primary/80 rounded-md pointer-events-none animate-pulse flex items-center justify-center">
              <span className="text-xs text-white bg-black/70 px-2 py-1 rounded">
                Align QR code inside box
              </span>
            </div>
          </div>
          <p className="text-small text-ink-muted mt-2">Hold the QR code steadily in front of the camera.</p>
        </div>
      </Card>

      {error && <Alert tone="danger" title="Verification failed">{error}</Alert>}

      {!checked && !error && (
        <Card>
          <div className="flex flex-col items-center text-center py-8 gap-2">
            <QrCode size={40} className="text-ink-muted" />
            <p className="text-h3 text-ink">Ready to verify</p>
            <p className="text-small text-ink-muted max-w-md">
              Enter any batch ID, upload a QR code image (saved from any batch page), or use your camera to instantly verify authenticity against the blockchain ledger.
            </p>
          </div>
        </Card>
      )}

      {checked && result?.found && result.authentic && (
        <div className="flex flex-col gap-6">
          <Card className="border-success bg-success-tint">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-success shrink-0" size={28} />
              <div>
                <p className="text-h3 text-success-text">Authentic medicine</p>
                <p className="text-small text-success-text/80">Confirmed against tamper-proof blockchain records.</p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader
              title={result.batch.medicineName}
              subtitle={result.batch.id}
              action={<Badge status={result.batch.status} />}
            />
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
              <div>
                <dt className="text-label text-ink-muted">Manufacturer</dt>
                <dd className="text-body text-ink font-medium">{result.batch.manufacturer}</dd>
              </div>
              <div>
                <dt className="text-label text-ink-muted">Current Custodian</dt>
                <dd className="text-body text-ink font-medium">{result.batch.currentOwner}</dd>
              </div>
              <div>
                <dt className="text-label text-ink-muted">Manufacturing Date</dt>
                <dd className="text-body text-ink">{result.batch.manufacturingDate}</dd>
              </div>
              <div>
                <dt className="text-label text-ink-muted">Expiry Date</dt>
                <dd className="text-body text-ink">{result.batch.expiryDate}</dd>
              </div>
              {result.batch.riskLevel && (
                <div>
                  <dt className="text-label text-ink-muted">AI Risk Assessment</dt>
                  <dd className="text-body text-ink">
                    <span className="font-semibold">{result.batch.riskScore}/100</span> ({result.batch.riskLevel})
                  </dd>
                </div>
              )}
            </dl>
            <Link to={`/app/batches/${result.batch.id}`} className="text-small text-primary font-medium">
              View full batch details & timeline →
            </Link>
          </Card>
          {result.batch.timeline && result.batch.timeline.length > 0 && (
            <Card>
              <CardHeader title="Chain of custody audit trail" />
              <Timeline steps={result.batch.timeline} />
            </Card>
          )}
        </div>
      )}

      {checked && result?.found && !result.authentic && (
        <div className="flex flex-col gap-6">
          <Card className="border-danger bg-danger-tint">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-danger shrink-0" size={28} />
              <div>
                <p className="text-h3 text-danger-text">Caution: This batch has been recalled</p>
                <p className="text-small text-danger-text/80">
                  Do not distribute or dispense. Quarantine remaining stock immediately.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader
              title={result.batch.medicineName}
              subtitle={result.batch.id}
              action={<Badge status={result.batch.status} />}
            />
            <p className="text-body text-ink">{result.batch.riskReason || "Batch recalled by manufacturer or regulatory authority."}</p>
            <Link to={`/app/batches/${result.batch.id}`} className="text-small text-primary font-medium block mt-3">
              View full batch details →
            </Link>
          </Card>
        </div>
      )}

      {checked && result && !result.found && (
        <Card className="border-border">
          <div className="flex flex-col items-center text-center gap-2 py-10">
            <XCircle className="text-ink-faint" size={32} />
            <p className="text-h3 text-ink">We could not verify this batch</p>
            <p className="text-small text-ink-muted max-w-sm">
              "{query}" does not match any registered batch in the supply chain. Double-check the ID or QR code.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
