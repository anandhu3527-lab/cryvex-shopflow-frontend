import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { productDataService } from "../../services/data/productDataService";
import { customerDataService } from "../../services/data/customerDataService";
import { kadanDataService } from "../../services/data/kadanDataService";
import { billingApi } from "../../services/api/billingApi";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { resolveBillItemPricing } from "../../utils/calculations/billCalculations";

/* ─────────────────────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  {
    key: "cash",
    label: "Cash",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "upi",
    label: "UPI",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0V8a4 4 0 00-4-4H8a4 4 0 00-4 4v12a4 4 0 004 4h8a4 4 0 004-4v-4" />
      </svg>
    ),
  },
  {
    key: "kadan",
    label: "Credit (கடன்)",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function formatINR(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resolveProductPricing(regularPriceInput, offerPriceInput) {
  const regularPrice =
    regularPriceInput !== null &&
    regularPriceInput !== undefined &&
    typeof regularPriceInput !== "boolean" &&
    String(regularPriceInput).trim() !== "" &&
    Number.isFinite(Number(regularPriceInput))
      ? Math.max(0, Number(regularPriceInput))
      : 0;

  const rawOffer =
    offerPriceInput !== null &&
    offerPriceInput !== undefined &&
    typeof offerPriceInput !== "boolean" &&
    String(offerPriceInput).trim() !== "" &&
    Number.isFinite(Number(offerPriceInput))
      ? Number(offerPriceInput)
      : null;

  const hasOffer =
    rawOffer !== null &&
    rawOffer > 0 &&
    regularPrice > 0 &&
    rawOffer < regularPrice;

  return {
    price: hasOffer ? rawOffer : regularPrice,
    regular_price: regularPrice,
    original_price: regularPrice,
    offer_price: hasOffer ? rawOffer : null,
    has_offer: hasOffer,
  };
}

function normalizeCustomer(customer) {
  const id = customer.id || customer.customer_id;
  if (!id) return null;

  return {
    ...customer,
    id,
    name: customer.name || customer.customer_name || "",
    phone: customer.phone || customer.customer_phone || "",
    email: customer.email || null,
    type: customer.status || "Customer",
  };
}


function normalizeBillingCatalogue(data, categoryList = []) {
  const records = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];

  const categoryMap = new Map(
    (Array.isArray(categoryList) ? categoryList : [])
      .filter((category) => category?.id != null && category?.name)
      .map((category) => [String(category.id), String(category.name).trim()])
  );

  return records.flatMap((product) => {
    const categoryId =
      product.category_id ??
      product.categoryId ??
      product.category?.id;

    const categoryObjectName =
      product.category && typeof product.category === "object"
        ? product.category.name
        : null;

    const categoryString =
      typeof product.category === "string" ? product.category.trim() : "";

    // Prefer the authoritative category ID mapping. The data service can
    // transform products before categories are loaded, leaving a stale
    // "Uncategorized" label even though category_id is valid.
    const categoryName =
      (categoryId != null ? categoryMap.get(String(categoryId)) : null) ||
      (categoryObjectName &&
      categoryObjectName.trim().toLowerCase() !== "uncategorized"
        ? categoryObjectName.trim()
        : null) ||
      (categoryString &&
      categoryString.toLowerCase() !== "uncategorized" &&
      categoryString.toLowerCase() !== "general"
        ? categoryString
        : null) ||
      "Uncategorized";

    return (Array.isArray(product.variants) ? product.variants : []).map((variant) => {
      const pricing = resolveProductPricing(
        variant.selling_price ?? variant.price ?? product.selling_price ?? product.price ?? 0,
        variant.offer_price ?? variant.offerPrice ?? product.offer_price ?? product.offerPrice
      );

      return {
        id: variant.id,
        variantId: variant.id,
        productId: product.id,
        name: product.name,
        category: categoryName,
        price: pricing.price,
        regular_price: pricing.regular_price,
        original_price: pricing.original_price,
        offer_price: pricing.offer_price,
        has_offer: pricing.has_offer,
        gst: Number(variant.tax_rate ?? 0),
        barcode: variant.barcode || "",
        sku: variant.sku || "",
        unit: variant.unit || "",
        package_quantity: variant.package_quantity || "",
        stock_quantity: Number(variant.stock_quantity ?? variant.stock ?? 0),
        low_stock_threshold: Number(variant.low_stock_threshold ?? 5),
      };
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   BARCODE SCANNER MODAL
───────────────────────────────────────────────────────────────────────────── */
function BarcodeScanner({ onFound, onClose, scanFeedback }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const lastScanRef = useRef({ barcode: null, time: 0 });

  const [state, setState] = useState(() =>
    typeof window !== "undefined" && "BarcodeDetector" in window ? "requesting" : "unsupported"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    lastScanRef.current = { barcode: null, time: 0 };
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    let isCancelled = false;

    async function initializeScanner() {
      // 1. Verify BarcodeDetector support
      if (!("BarcodeDetector" in window)) {
        if (!isCancelled) {
          setState("unsupported");
          setErrorMessage("Barcode detector is not supported on this browser. Use Chrome or Edge on Android.");
        }
        return;
      }

      try {
        if (window.BarcodeDetector.getSupportedFormats) {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const targetFormats = ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"];
          const formats = targetFormats.filter((fmt) => supported.includes(fmt));
          detectorRef.current = new window.BarcodeDetector({ formats: formats.length > 0 ? formats : supported });
        } else {
          detectorRef.current = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "upc_a", "qr_code"] });
        }
      } catch {
        try {
          detectorRef.current = new window.BarcodeDetector();
        } catch {
          if (!isCancelled) {
            setState("unsupported");
            setErrorMessage("Could not initialize barcode detector.");
          }
          return;
        }
      }

      if (isCancelled) return;

      // 2. Verify mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!isCancelled) {
          setState("unsupported");
          setErrorMessage("Camera access is not supported on this browser.");
        }
        return;
      }

      // 3. Camera initialization with rear/environment camera preferred and audio disabled
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (err) {
        if (isCancelled) return;
        // If overconstrained (e.g. device has no environment camera), retry with standard video
        if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (retryErr) {
            if (!isCancelled) handleCameraError(retryErr);
            return;
          }
        } else {
          if (!isCancelled) handleCameraError(err);
          return;
        }
      }

      if (isCancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // 4. Validate video track existence and live state
      const tracks = stream.getVideoTracks();
      if (!tracks || tracks.length === 0 || tracks[0].readyState !== "live") {
        stream.getTracks().forEach((t) => t.stop());
        if (!isCancelled) {
          setState("error");
          setErrorMessage("Camera is currently unavailable or video track is inactive.");
        }
        return;
      }

      streamRef.current = stream;

      // 5. Attach stream to HTML video element (guaranteed to be mounted in DOM)
      const video = videoRef.current;
      if (!video) {
        if (!isCancelled) {
          setState("error");
          setErrorMessage("Video display element not found.");
        }
        return;
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      // 6. Start video playback
      try {
        await video.play();
      } catch {
        if (isCancelled) return;
      }

      if (isCancelled) return;

      // 7. Wait for video metadata & readiness (readyState >= 2 and positive dimensions)
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        await new Promise((resolve) => {
          let resolved = false;
          const finish = () => {
            if (!resolved) {
              resolved = true;
              video.removeEventListener("loadeddata", finish);
              video.removeEventListener("canplay", finish);
              video.removeEventListener("loadedmetadata", finish);
              resolve();
            }
          };
          video.addEventListener("loadedmetadata", finish, { once: true });
          video.addEventListener("loadeddata", finish, { once: true });
          video.addEventListener("canplay", finish, { once: true });
          setTimeout(finish, 1500);
        });
      }

      if (isCancelled) return;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        await new Promise((r) => requestAnimationFrame(r));
      }

      if (isCancelled) return;

      setState("scanning");
      startBarcodeDetection();
    }

    function handleCameraError(err) {
      let msg = "Unable to start camera. Please try again.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setState("denied");
        msg = "Camera permission is required to scan barcodes. Please allow camera access in browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setState("error");
        msg = "No camera was found on this device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setState("error");
        msg = "Camera is currently being used by another application.";
      } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
        setState("error");
        msg = "Camera configuration is not supported on this device.";
      } else if (err.name === "SecurityError") {
        setState("error");
        msg = "Camera access is restricted by browser security policy.";
      } else if (err.name === "AbortError") {
        setState("error");
        msg = "Camera initialization was aborted.";
      } else {
        setState("error");
      }
      setErrorMessage(msg);
    }

    function startBarcodeDetection() {
      let isDetecting = false;
      let lastDetectTimestamp = 0;

      function scanLoop(timestamp) {
        if (isCancelled || !videoRef.current || !detectorRef.current) return;
        const vid = videoRef.current;

        if (vid.readyState >= 2 && vid.videoWidth > 0 && !isDetecting) {
          if (!lastDetectTimestamp || timestamp - lastDetectTimestamp >= 100) {
            lastDetectTimestamp = timestamp;
            isDetecting = true;

            detectorRef.current
              .detect(vid)
              .then((barcodes) => {
                isDetecting = false;
                if (isCancelled) return;
                const now = Date.now();
                if (barcodes && barcodes.length > 0) {
                  const raw = barcodes[0].rawValue;
                  
                  // Same-barcode continuous detection prevention:
                  // Only accept if it's a NEW barcode, or if the old one was cleared.
                  if (raw !== lastScanRef.current.barcode) {
                    lastScanRef.current = { barcode: raw, time: now };
                    onFound(raw);
                  } else {
                    // Same barcode is still in frame, update time to keep it "active"
                    lastScanRef.current.time = now;
                  }
                } else {
                  // No barcode in this frame
                  // If we haven't seen the last barcode for > 500ms, clear it so it can be scanned again
                  if (lastScanRef.current.barcode && now - lastScanRef.current.time > 500) {
                    lastScanRef.current = { barcode: null, time: 0 };
                  }
                }
              })
              .catch(() => {
                isDetecting = false;
              });
          }
        }

        rafRef.current = requestAnimationFrame(scanLoop);
      }

      rafRef.current = requestAnimationFrame(scanLoop);
    }

    initializeScanner();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [onFound, stopCamera]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-base font-bold text-white">Barcode Scanner</h2>
          <p className="text-xs text-slate-400 mt-0.5">Point camera at product barcode</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Camera / state area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-5">
        {(state === "requesting" || state === "scanning") && (
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/60 shadow-2xl flex items-center justify-center">
            {/* Real HTML video element - always mounted in DOM */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover block"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            {/* Spinner overlay while requesting / initializing camera */}
            {state === "requesting" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-sm font-medium">Starting camera...</p>
              </div>
            )}

            {/* Active Scanning frame overlay */}
            {state === "scanning" && (
              <>
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-transparent">
                  <div className="relative w-48 h-48">
                    {/* Corner markers */}
                    {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                      <span
                        key={i}
                        className={`absolute w-7 h-7 border-blue-400 ${pos} ${
                          i === 0
                            ? "border-t-2 border-l-2 rounded-tl-md"
                            : i === 1
                            ? "border-t-2 border-r-2 rounded-tr-md"
                            : i === 2
                            ? "border-b-2 border-l-2 rounded-bl-md"
                            : "border-b-2 border-r-2 rounded-br-md"
                        }`}
                      />
                    ))}
                    {/* Scanning laser line */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400/80 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  </div>
                </div>

                {/* Scan label */}
                <div className="absolute bottom-3 inset-x-0 z-10 text-center pointer-events-none">
                  <span className="text-xs font-medium text-white/90 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                    Scanning continuously…
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {state === "unsupported" && (
          <div className="text-center space-y-3 max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-900/30 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Barcode scanner not supported</p>
            <p className="text-xs text-slate-400">{errorMessage || "Use Chrome or Edge browser on Android for barcode scanning. You can still search products manually."}</p>
            <button type="button" onClick={handleClose} className="mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer">Close</button>
          </div>
        )}

        {state === "denied" && (
          <div className="text-center space-y-3 max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-rose-900/30 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Camera permission denied</p>
            <p className="text-xs text-slate-400">{errorMessage || "Camera permission is required to scan barcodes. Please allow camera access in your browser settings, then try again."}</p>
            <button type="button" onClick={handleClose} className="mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer">Close</button>
          </div>
        )}

        {state === "error" && (
          <div className="text-center space-y-3 max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-rose-900/30 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-white">Camera error</p>
            <p className="text-xs text-slate-400">{errorMessage || "Could not access camera. Please check your device settings."}</p>
            <button type="button" onClick={handleClose} className="mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer">Close</button>
          </div>
        )}

        {/* Scan feedback */}
        {scanFeedback && state === "scanning" && (
          <div className="w-full max-w-sm px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm text-center shadow-lg">
            {scanFeedback}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function QuickBill() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshNotifications } = useNotifications();
  const { currentTenant, currentUser } = useAuth();
  const effectiveShopName = (
    currentTenant?.name ||
    currentTenant?.business_name ||
    currentTenant?.shopName ||
    currentTenant?.shop_name ||
    currentUser?.shop?.name ||
    currentUser?.shop_name ||
    ""
  ).trim();
  const incomingCustomer = location.state?.customer;
  const initialCustomer = incomingCustomer ? normalizeCustomer(incomingCustomer) : null;
  /* ── Billing items ── */
  const [items,           setItems]           = useState([]);
  const [catalogue,       setCatalogue]       = useState([]);
  const [catalogLoading,  setCatalogLoading]  = useState(true);
  const [catalogError,    setCatalogError]    = useState("");
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [productSearch,   setProductSearch]   = useState("");
  const [showProductDrop, setShowProductDrop] = useState(false);
  const searchRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowProductDrop(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Customer Details ── */
  const [showCustomer,     setShowCustomer]     = useState(Boolean(initialCustomer));
  const [customerName,     setCustomerName]     = useState(initialCustomer?.name || "");
  const [customerPhone,    setCustomerPhone]    = useState(initialCustomer?.phone.replace(/\D/g, "").slice(-10) || "");
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer);
  const [customerLoading,  setCustomerLoading]  = useState(false);
  const [customerMatches,  setCustomerMatches]  = useState([]);
  const [customerLookup,   setCustomerLookup]   = useState(initialCustomer ? "found" : "idle");
  const [lookupRetry,      setLookupRetry]      = useState(0);
  const [phoneTouched,     setPhoneTouched]     = useState(false);
  const [phoneInputInvalid, setPhoneInputInvalid] = useState(false);
  const [nameTouched,      setNameTouched]      = useState(false);
  const [nameInputInvalid, setNameInputInvalid] = useState(false);
  const lookupRequestRef = useRef(0);
  const customerPhoneRef = useRef(null);

  /* ── Pricing ── */
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType,  setDiscountType]  = useState("amount");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [paymentMethod,  setPaymentMethod]  = useState("cash");

  /* Payment animation state (reserved for future use) */


  /* ── Barcode scanner ── */
  const [showScanner, setShowScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);

  // Synchronous debounce and processing lock refs to prevent multi-frame duplicate increments
  const isScanningProcessingRef = useRef(false);
  const lastAcceptedScanRef = useRef({ barcode: null, timestamp: 0 });

  /* ── Toast ── */
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    let isMounted = true;

    const loadCatalogue = async () => {
      try {
        // Categories must be available before products are mapped for billing.
        const categoryList = await productDataService.fetchCategories();
        const data = await productDataService.getProducts();
        const variants = normalizeBillingCatalogue(data, categoryList);

        if (isMounted) {
          setCatalogue(variants);
          setCatalogError("");
        }
      } catch (error) {
        if (isMounted) {
          setCatalogError(error?.message || "Could not load products.");
        }
      } finally {
        if (isMounted) setCatalogLoading(false);
      }
    };

    loadCatalogue();
    return () => { isMounted = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    catalogue.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [catalogue]);

  /* ─── Filtered lists (All products returned without artificial limit) ───────── */
  const filteredProducts = useMemo(() => {
    let list = catalogue;
    if (selectedCategory && selectedCategory !== "ALL") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (productSearch.trim()) {
      const term = productSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(term) ||
          (p.category || "").toLowerCase().includes(term) ||
          (p.sku || "").toLowerCase().includes(term) ||
          (p.barcode || "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [catalogue, productSearch, selectedCategory]);

  useEffect(() => {
    const phone = customerPhone;
    if (!/^\d{10}$/.test(phone)) {
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      const requestId = ++lookupRequestRef.current;
      setCustomerLoading(true);
      setCustomerLookup("loading");
      setCustomerMatches([]);

      try {
        const records = [];
        const pageSize = 100;
        let offset = 0;
        let page;
        do {
          const response = await customerDataService.getCustomers({ limit: pageSize, offset });
          page = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
          records.push(...page);
          offset += page.length;
        } while (page.length === pageSize);

        if (requestId !== lookupRequestRef.current) return;
        const matches = records
          .map(normalizeCustomer)
          .filter((customer) => customer && customer.phone.replace(/\D/g, "").slice(-10) === phone);

        setCustomerMatches(matches);
        if (matches.length === 1) {
          setSelectedCustomer(matches[0]);
          setCustomerName(matches[0].name);
          setCustomerLookup("found");
        } else {
          setCustomerLookup(matches.length > 1 ? "multiple" : "notFound");
        }
      } catch {
        if (requestId === lookupRequestRef.current) setCustomerLookup("error");
      } finally {
        if (requestId === lookupRequestRef.current) setCustomerLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      lookupRequestRef.current += 1;
    };
  }, [customerPhone, lookupRetry]);

  useEffect(() => {
    if (!selectedCustomer?.id) return;
    let isCurrentCustomer = true;

    kadanDataService.getCustomerLedger(selectedCustomer.id)
      .then((response) => {
        const ledger = response?.data || response;
        const balanceValue = ledger?.outstanding_amount ?? ledger?.outstanding_balance;
        if (isCurrentCustomer && balanceValue !== undefined && balanceValue !== null) {
          setSelectedCustomer((current) => current?.id === selectedCustomer.id
            ? { ...current, kadanBalance: balanceValue }
            : current);
        }
      })
      .catch(() => {});

    return () => { isCurrentCustomer = false; };
  }, [selectedCustomer?.id]);


  /* ─── Calculations ─────────────────────────────────────────────────── */
  const subtotal = roundMoney(items.reduce((sum, item) => {
    const price = Math.max(0, Number(item.price) || 0);
    const quantity = Math.max(0, Number(item.qty) || 0);
    return sum + price * quantity;
  }, 0));

  const totalLineDiscounts = roundMoney(items.reduce((sum, item) => {
    const lineAmount = Math.max(0, Number(item.price) || 0) * Math.max(0, Number(item.qty) || 0);
    const lineDiscount = Math.max(0, Number(item.disc) || 0);
    return sum + Math.min(lineAmount, lineDiscount);
  }, 0));

  const discountInput = Math.max(0, Number(discountValue) || 0);
  const discountBase = Math.max(0, subtotal - totalLineDiscounts);
  const billDiscountAmt = roundMoney(discountType === "percent"
    ? discountBase * Math.min(100, discountInput) / 100
    : Math.min(discountBase, discountInput));

  const totalDiscount = roundMoney(Math.min(subtotal, totalLineDiscounts + billDiscountAmt));
  const totalOfferSavings = roundMoney(items.reduce((sum, item) => {
    const p = resolveBillItemPricing(item);
    return sum + p.totalSavings;
  }, 0));
  const isDiscountOverTotal =
    (discountType === "percent" && discountInput > 100) ||
    (discountType === "amount" && discountInput > discountBase) ||
    totalLineDiscounts > subtotal;
  const taxableAmount = Math.max(0, roundMoney(subtotal - totalDiscount));

  // Preview tax is estimated from each product's configured tax rate.
  // The saved backend response is authoritative, especially where the shop
  // uses tax-inclusive pricing or jurisdiction-specific rounding.
  const estimatedTax = roundMoney(items.reduce((sum, item) => {
    const lineAmount = Math.max(0, Number(item.price) || 0) * Math.max(0, Number(item.qty) || 0);
    const lineDiscount = Math.min(lineAmount, Math.max(0, Number(item.disc) || 0));
    const afterItemDiscount = Math.max(0, lineAmount - lineDiscount);
    const allocatedBillDiscount = discountBase > 0
      ? billDiscountAmt * (afterItemDiscount / discountBase)
      : 0;
    const taxBase = Math.max(0, afterItemDiscount - allocatedBillDiscount);
    const taxRate = Math.max(0, Number(item.gst) || 0);
    return sum + taxBase * taxRate / 100;
  }, 0));

  const grandTotal = Math.max(0, roundMoney(taxableAmount + estimatedTax));

  // A blank or zero Received Amount means no money was collected.
  // This matches submission: a positive bill with zero received is treated as Kadan.
  const rawReceivedAmount = receivedAmount.trim() === "" ? 0 : Number(receivedAmount);
  const received = Math.max(
    0,
    Number.isFinite(rawReceivedAmount) ? rawReceivedAmount : 0
  );
  const appliedReceived = Math.min(grandTotal, roundMoney(received));
  const creditAmount = Math.max(0, roundMoney(grandTotal - appliedReceived));
  const changeDue = paymentMethod === "cash"
    ? Math.max(0, roundMoney(received - grandTotal))
    : 0;

  /* ─── Actions ──────────────────────────────────────────────────────── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3200);
  }, []);

  const addProduct = (product) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        {
          id: product.id,
          variantId: product.variantId,
          productId: product.productId,
          name: product.name,
          category: product.category,
          price: product.price,
          regular_price: product.regular_price ?? product.price,
          original_price: product.original_price ?? product.regular_price ?? product.price,
          offer_price: product.offer_price ?? null,
          has_offer: Boolean(product.has_offer),
          gst: Number(product.gst || 0),
          unit: product.unit,
          qty: 1,
          disc: 0,
        },
      ];
    });
  };

  const updateQty = (id, delta) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
    );
  };

  const setItemQty = (id, newQty) => {
    const val = Math.max(1, parseInt(newQty, 10) || 1);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: val } : i)));
  };

  const updateDisc = (id, val) => {
    const num = Math.max(0, Number(val) || 0);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, disc: num } : i)));
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handlePhoneChange = (event) => {
    const value = event.target.value;
    if (!/^\d*$/.test(value) || value.length > 10) {
      setPhoneInputInvalid(true);
      return;
    }
    setPhoneInputInvalid(false);
    setPhoneTouched(false);
    setCustomerLoading(false);
    setSelectedCustomer(null);
    setCustomerMatches([]);
    setCustomerLookup("idle");
    setCustomerName("");
    setNameInputInvalid(false);
    setCustomerPhone(value.replace(/\D/g, "").slice(0, 10));
  };

  const handleCustomerNameChange = (event) => {
    const value = event.target.value;
    if (!/^[\p{L} ]*$/u.test(value)) {
      setNameInputInvalid(true);
      return;
    }
    setNameInputInvalid(false);
    setCustomerName(value.replace(/ {2,}/g, " ").replace(/^ +/, ""));
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customerPhone.replace(/\D/g, "").slice(0, 10));
    setCustomerLookup("found");
  };

  const handleBarcodeFound = async (barcode) => {
    if (!barcode) return;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. PROCESSING LOCK:
    // Prevent multiple detections across rapid video frames from triggering
    // simultaneous API requests while a product lookup/addition is already in flight.
    // ──────────────────────────────────────────────────────────────────────────
    if (isScanningProcessingRef.current) {
      return;
    }

    // Acquire lock to prevent overlapping API calls for rapid consecutive scans
    isScanningProcessingRef.current = true;

    try {
      const result = await productDataService.getProductByBarcode(barcode);
      const productData = result || null;
      const variant = productData?.variants?.[0];

      if (!productData || !variant) {
        setScanFeedback(
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-rose-400">Product not found</span>
            <span className="text-slate-300 text-[10px]">Barcode: {barcode}</span>
          </div>
        );
        return;
      }

      const currentStock = Number(variant.stock_quantity || 0);

      const pricing = resolveProductPricing(
        variant.selling_price ?? variant.price ?? productData.selling_price ?? productData.price ?? 0,
        variant.offer_price ?? variant.offerPrice ?? productData.offer_price ?? productData.offerPrice
      );

      const product = {
        id: variant.id,
        variantId: variant.id,
        productId: productData.id,
        name: productData.name,
        category: productData.category,
        price: pricing.price,
        regular_price: pricing.regular_price,
        original_price: pricing.original_price,
        offer_price: pricing.offer_price,
        has_offer: pricing.has_offer,
        gst: Number(variant.tax_rate ?? 0),
        barcode: variant.barcode || barcode,
        sku: variant.sku || "",
        unit: variant.unit || "",
      };

      setItems((prev) => {
        const ex = prev.find((i) => i.id === product.id);
        const currentQty = ex ? ex.qty : 0;
        const newQty = currentQty + 1;
        
        if (currentStock > 0 && newQty > currentStock) {
          setTimeout(() => {
            setScanFeedback(
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-amber-400">Product is out of stock.</span>
                <span className="text-slate-300 text-[10px]">{productData.name} (Max: {currentStock})</span>
              </div>
            );
          }, 0);
          return prev;
        }

        setTimeout(() => {
          setScanFeedback(
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-300 text-[10px] uppercase tracking-wider">Last scanned</span>
              <span className="font-bold text-emerald-400">{productData.name}</span>
              <span className="text-white text-[10px]">+1 added (Qty: {newQty})</span>
            </div>
          );
          
          showToast(`✓ Product Added\n${productData.name} × 1`, "success");
          
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try { navigator.vibrate(50); } catch { /* vibrate not supported */ }
          }
          
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
          } catch { /* audio beep not available */ }
        }, 0);

        if (ex) {
          return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, { ...product, qty: 1, disc: 0 }];
      });
    } catch (error) {
      // Inspect the HTTP status from AppError.details.status (set by apiClient)
      // to distinguish business-level "not found" from real technical failures.
      const httpStatus = error?.details?.status;
      const rawMsg = (error?.message || "").toLowerCase();
      const isNetworkError =
        !httpStatus &&
        (rawMsg.includes("network") ||
          rawMsg.includes("failed to fetch") ||
          rawMsg.includes("timeout") ||
          rawMsg.includes("aborted") ||
          error?.name === "AbortError");

      let feedbackTitle;
      let feedbackBody;

      if (httpStatus === 404) {
        // Expected business case: barcode is not registered in this shop's products
        feedbackTitle = <span className="font-bold text-amber-400">Product not found</span>;
        feedbackBody = <span className="text-slate-300 text-[10px]">This barcode is not registered in your products.</span>;
      } else if (httpStatus === 401) {
        feedbackTitle = <span className="font-bold text-rose-400">Session expired</span>;
        feedbackBody = <span className="text-slate-300 text-[10px]">Your session has expired. Please log in again.</span>;
      } else if (httpStatus === 403) {
        feedbackTitle = <span className="font-bold text-rose-400">Access denied</span>;
        feedbackBody = <span className="text-slate-300 text-[10px]">You don't have permission to perform this action.</span>;
      } else if (isNetworkError) {
        feedbackTitle = <span className="font-bold text-rose-400">Network error</span>;
        feedbackBody = <span className="text-slate-300 text-[10px]">Please check your connection and try again.</span>;
      } else if (httpStatus >= 500) {
        feedbackTitle = <span className="font-bold text-rose-400">Server error</span>;
        feedbackBody = <span className="text-slate-300 text-[10px]">Unable to check this barcode. Please try again.</span>;
      } else {
        feedbackTitle = <span className="font-bold text-rose-400">Unable to check barcode</span>;
        feedbackBody = <span className="text-slate-300 text-[10px]">Please try again.</span>;
      }

      setScanFeedback(
        <div className="flex flex-col gap-0.5">
          {feedbackTitle}
          {feedbackBody}
        </div>
      );
    } finally {
      // ──────────────────────────────────────────────────────────────────────────
      // 3. ALWAYS RELEASE LOCK:
      // Guarantees the processing lock is released upon success, product not found,
      // out of stock, or API network error so subsequent scans proceed reliably.
      // ──────────────────────────────────────────────────────────────────────────
      isScanningProcessingRef.current = false;
    }
  };

  // handleAddProductClick: focus search input (called via searchRef.current.focus() inline)

  const [successBill, setSuccessBill] = useState(null);
  const [receiptPhone, setReceiptPhone] = useState("");

  const handleGenerateBill = async () => {
    if (items.length === 0) {
      showToast("Add at least one product to generate a bill.", "error");
      return;
    }
    if (isDiscountOverTotal) {
      showToast(
        discountType === "percent"
          ? "Discount percentage cannot exceed 100%."
          : `Discount amount cannot be greater than subtotal (₹${formatINR(subtotal)}).`,
        "error"
      );
      return;
    }
    const activePaymentMethod = paymentMethod || "cash";

    // If customer toggle is off or fields are empty, treat as Walk-in Customer
    const name = showCustomer ? (selectedCustomer?.name || customerName).trim().replace(/\s+/g, " ") : "";
    const phone = showCustomer ? customerPhone.replace(/\D/g, "").slice(0, 10) : "";

    // An empty or zero received amount means no money was collected.
    // Such a bill must be sent as KADAN, never as CASH/UPI with paid_amount=0.
    // A positive amount retains the cashier's selected payment method.
    const rawParsed = receivedAmount.trim() === "" ? 0 : Number(receivedAmount);
    const paidAmount = roundMoney(rawParsed);

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      showToast("Received amount must be a valid non-negative number.", "error");
      return;
    }
    if (paidAmount > grandTotal + 0.005) {
      showToast("Received amount cannot exceed the final bill total.", "error");
      return;
    }

    // If nothing was received, classify this as a credit sale so the API does
    // not receive the invalid combination CASH/UPI + paid_amount=0.
    const effectivePaymentMethod =
      grandTotal > 0 && paidAmount <= 0.005 ? "kadan" : activePaymentMethod;

    const outstandingBalance = roundMoney(
      Math.max(0, grandTotal - Math.min(grandTotal, paidAmount))
    );
    const hasOutstandingKadan = outstandingBalance > 0.005;

    // A fully paid bill must not be submitted as KADAN.
    if (effectivePaymentMethod === "kadan" && grandTotal > 0 && !hasOutstandingKadan) {
      showToast("The received amount covers the full bill. Select Cash or UPI because no Kadan balance remains.", "error");
      return;
    }

    const hasDiscount = Number(totalDiscount || 0) > 0;
    const requiresCustomer = hasOutstandingKadan || hasDiscount;

    if (requiresCustomer) {
      setNameTouched(true);
      setPhoneTouched(true);
      if (!name || !phone) {
        const reason = hasOutstandingKadan ? "an outstanding balance (Kadan)" : "a bill discount";
        showToast(`Customer name and 10-digit phone number are required because this bill has ${reason}.`, "error");
        setShowCustomer(true);
        return;
      }
      if (phoneInputInvalid || !/^\d{10}$/.test(phone)) {
        showToast("Valid 10-digit Indian phone number is required.", "error");
        setShowCustomer(true);
        return;
      }
    } else if (showCustomer && (name || phone)) {
      if (!name || !phone) {
        showToast("Customer name and phone number must be provided together, or leave both empty for Walk-in Customer.", "error");
        return;
      }
      if (phoneInputInvalid || !/^\d{10}$/.test(phone)) {
        setPhoneTouched(true);
        showToast("Phone number must contain exactly 10 digits.", "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const paymentMethodValue = effectivePaymentMethod === "kadan" ? "KADAN" : effectivePaymentMethod.toUpperCase();
      const hasSpecificCustomer = Boolean(name && phone);
      const customerNameToSend = hasSpecificCustomer ? name : null;
      const customerPhoneToSend = hasSpecificCustomer ? phone : null;

      const result = await billingApi.createBill({
        customer_name: customerNameToSend,
        customer_phone: customerPhoneToSend,
        items: items.map((item) => ({ variant_id: item.variantId, quantity: item.qty })),
        // Only send the user-entered additional bill-level discount.
        // Item-level offer discounts are already reflected in variant prices that the
        // backend uses when it computes the bill total — sending them again here would
        // cause the backend total to differ from paidAmount, making the backend
        // classify a fully-paid Cash/UPI bill as Kadan/partial.
        discount_amount: Number(billDiscountAmt || 0),
        paid_amount: paidAmount,
        payment_method: paymentMethodValue,
      });

      const billData = result?.data ? result.data : result;
      // Never show a success receipt if the API returns an error-shaped payload.
      if (billData?.detail || billData?.error) {
        const apiMessage =
          typeof billData.detail === "string"
            ? billData.detail
            : typeof billData.error === "string"
              ? billData.error
              : "The server rejected the bill.";
        throw new Error(apiMessage);
      }
      const billId = billData?.bill_id || billData?.id || null;
      const savedTotalValue = billData?.total_amount ?? billData?.grand_total;
      if (!billId || savedTotalValue === undefined || savedTotalValue === null || !Number.isFinite(Number(savedTotalValue))) {
        throw new Error("The server response did not include the saved bill ID and total. The bill status could not be verified; check Bill History before retrying.");
      }

      const billNumber = billData?.bill_number || billId;
      const billTotal = roundMoney(savedTotalValue);
      const billSubtotal = roundMoney(billData?.subtotal ?? subtotal);
      const billDiscount = roundMoney(billData?.discount_amount ?? totalDiscount);
      const billPaid = roundMoney(billData?.paid_amount ?? billData?.received_amount ?? paidAmount);
      const billBalance = roundMoney(
        billData?.balance_amount ??
        billData?.outstanding_amount ??
        billData?.remaining_amount ??
        Math.max(0, billTotal - billPaid)
      );
      const billCredit = roundMoney(
        billData?.kadan_amount ?? billBalance
      );

      setSuccessBill({
        id: billId,
        bill_number: billNumber,
        total: billTotal,
        subtotal: billSubtotal,
        discount: billDiscount,
        tax: roundMoney(billData?.tax_amount ?? estimatedTax),
        paid_amount: billPaid,
        balance_amount: billBalance,
        credit: billCredit,
        payment_status: billData?.payment_status || billData?.status || (billBalance <= 0 ? "PAID" : billPaid > 0 ? "PARTIALLY PAID" : "UNPAID"),
        payment_method: billData?.payment_method || paymentMethodValue,
        customer_name: billData?.customer_name || (hasSpecificCustomer ? name : "Walk-in Customer"),
        customer_phone: billData?.customer_phone || (hasSpecificCustomer ? phone : ""),
        // Prefer backend-returned line items if supplied; keep local items only as display fallback.
        items: Array.isArray(billData?.items) ? billData.items : items,
      });
      setReceiptPhone(hasSpecificCustomer ? phone : "");
      refreshNotifications();

      // Refresh products catalogue to update stock counts
      Promise.all([
        productDataService.fetchCategories(),
        productDataService.getProducts(),
      ]).then(([categoryList, res]) => {
        setCatalogue(normalizeBillingCatalogue(res, categoryList));
      }).catch(() => {});
    } catch (error) {
      showToast(error?.message || "Could not save the bill. Please check details and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const resetForm = () => {
    setItems([]);
    setDiscountValue(0);
    setDiscountType("amount");
    setReceivedAmount("");
    setPaymentMethod("cash");
    setSelectedCustomer(null);
    setShowCustomer(false);
    setProductSearch("");
    setCustomerMatches([]);
    setCustomerLookup("idle");
    setCustomerLoading(false);
    setLookupRetry(0);
    setCustomerName("");
    setCustomerPhone("");
    setReceiptPhone("");
    setPhoneTouched(false);
    setPhoneInputInvalid(false);
    setNameTouched(false);
    setNameInputInvalid(false);
  };

  const changeCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerMatches([]);
    setCustomerLookup("idle");
    setCustomerLoading(false);
    setPhoneTouched(false);
    setPhoneInputInvalid(false);
    requestAnimationFrame(() => customerPhoneRef.current?.focus());
  };

  const phoneValidationError = phoneTouched && (
    phoneInputInvalid ||
    ((customerPhone.length > 0 || paymentMethod === "kadan") && !/^\d{10}$/.test(customerPhone))
  ) ? "Phone number must contain exactly 10 digits." : "";
  const nameValidationError = nameInputInvalid
    ? "Name can contain only letters and spaces."
    : paymentMethod === "kadan" && nameTouched && !customerName.trim()
      ? "Customer name is required for Kadan credit."
      : "";

  /* ─── Render ───────────────────────────────────────────────────────── */
  if (successBill) {
    const handleWhatsApp = (targetPhone = receiptPhone) => {
      const cleanPhone = String(targetPhone || "").replace(/\D/g, "").slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        showToast("Please enter a valid 10-digit mobile number to send on WhatsApp.", "error");
        return;
      }

      const shopHeader = effectiveShopName ? `*${effectiveShopName.toUpperCase()}*\n` : "CRYVEX SHOPFLOW\n";
      let text = `${shopHeader}Bill No: ${successBill.bill_number}\n\n`;
      text += (successBill.customer_name && successBill.customer_name !== 'Walk-in Customer' ? `Customer: ${successBill.customer_name}\n\n` : "");
      
      let totalBillOfferSavings = 0;
      (successBill.items || []).forEach(item => {
        const p = resolveBillItemPricing(item);
        const name = item.name || item.item_name || item.product_name || 'Item';
        if (p.hasOffer) {
          totalBillOfferSavings += p.totalSavings;
          text += `${name} x ${p.quantity} = ₹${formatINR(p.lineTotal)} (Offer: ₹${formatINR(p.offerPrice)}, Orig: ~₹${formatINR(p.regularPrice)}~, Saved: ₹${formatINR(p.totalSavings)})\n`;
        } else {
          text += `${name} x ${p.quantity} = ₹${formatINR(p.lineTotal)}\n`;
        }
      });
      text += '\n';

      if (totalBillOfferSavings > 0) {
        text += `Total Offer Savings: ₹${formatINR(totalBillOfferSavings)}\n`;
      }
      if (successBill.discount > 0) {
        text += 'Subtotal: ₹' + formatINR(successBill.subtotal) + '\n';
        text += 'Discount: ₹' + formatINR(successBill.discount) + '\n';
      }
      if (successBill.tax > 0) {
        text += 'Tax: ₹' + formatINR(successBill.tax) + '\n';
      }
      text += 'Grand Total: ₹' + formatINR(successBill.total) + '\n\n';
      text += 'Payment Method: ' + successBill.payment_method + '\n';
      text += 'Amount Paid: ₹' + formatINR(successBill.paid_amount) + '\n';
      text += 'Balance Due (Kadan): ₹' + formatINR(successBill.credit) + '\n';
      text += 'Payment Status: ' + successBill.payment_status + '\n';
      text += `\nThank you for shopping with ${effectiveShopName || 'us'}!`;

      const formattedPhone = "91" + cleanPhone;
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
      showToast(`Opening WhatsApp for +91 ${cleanPhone}...`, "success");
    };

    return (
      <div className="max-w-2xl mx-auto py-12 px-4 flex flex-col items-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Bill Generated Successfully!</h1>
        <p className="text-slate-500 mb-8">Bill No: <span className="font-mono font-bold text-slate-800">{successBill.bill_number}</span></p>
        
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 space-y-4">
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Customer</span>
            <span className="font-bold text-slate-900">{successBill.customer_name || 'Walk-in Customer'}</span>
          </div>

          {/* Purchased Items List */}
          {Array.isArray(successBill.items) && successBill.items.length > 0 && (
            <div className="border-b border-slate-100 pb-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Items Purchased</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {successBill.items.map((item, idx) => {
                  const pricing = resolveBillItemPricing(item);
                  const name = item.name || item.item_name || item.product_name || `Item ${idx + 1}`;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-900 block truncate">{name}</span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                          <span>{pricing.quantity} × ₹{formatINR(pricing.effectivePrice)}</span>
                          {pricing.hasOffer && (
                            <>
                              <span className="text-slate-400 line-through">₹{formatINR(pricing.regularPrice)}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Offer Applied
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 block">₹{formatINR(pricing.lineTotal)}</span>
                        {pricing.totalSavings > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-600 block">
                            Saved ₹{formatINR(pricing.totalSavings)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(() => {
            const confirmationOfferSavings = (successBill.items || []).reduce((sum, item) => {
              const p = resolveBillItemPricing(item);
              return sum + p.totalSavings;
            }, 0);
            return confirmationOfferSavings > 0 ? (
              <div className="flex justify-between border-b border-slate-100 pb-3 text-emerald-700 font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 text-xs">
                <span>Offer Savings</span>
                <span>-₹{formatINR(confirmationOfferSavings)}</span>
              </div>
            ) : null;
          })()}
          {successBill.discount > 0 && (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-800">₹{formatINR(successBill.subtotal)}</span>
            </div>
          )}
          {successBill.discount > 0 && (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Discount</span>
              <span className="font-bold text-amber-600">-₹{formatINR(successBill.discount)}</span>
            </div>
          )}
          {successBill.tax > 0 && (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">GST / Tax</span>
              <span className="font-semibold text-slate-800">₹{formatINR(successBill.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Total Amount</span>
            <span className="font-bold text-slate-900">₹{formatINR(successBill.total)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Paid Amount</span>
            <span className="font-bold text-emerald-600">₹{formatINR(successBill.paid_amount)}</span>
          </div>
          {successBill.balance_amount > 0 && (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Outstanding Balance</span>
              <span className="font-bold text-rose-600">₹{formatINR(successBill.balance_amount)}</span>
            </div>
          )}
          {successBill.credit > 0 && (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Credit (Kadan)</span>
              <span className="font-bold text-rose-600">₹{formatINR(successBill.credit)}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Payment Status</span>
            <span className="font-bold text-slate-900">{successBill.payment_status}</span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="text-slate-500">Payment Method</span>
            <span className="font-bold text-slate-900">{successBill.payment_method}</span>
          </div>
        </div>

        {/* ── WhatsApp Receipt to Any Number ── */}
        <div className="w-full bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-4 sm:p-5 mb-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Send Receipt via WhatsApp
              </h3>
              <p className="text-[11px] text-slate-500">
                Enter any mobile number to send this bill receipt directly to customer&apos;s WhatsApp
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs font-bold pointer-events-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter 10-digit mobile number"
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleWhatsApp();
                  }
                }}
                className="w-full pl-12 pr-3 py-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 shadow-2xs placeholder-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => handleWhatsApp()}
              className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span>Send Receipt</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          {successBill.id && (
            <button
              onClick={() => navigate(`/bills/${successBill.id}`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Bill Details
            </button>
          )}
          <button onClick={() => { setSuccessBill(null); resetForm(); }} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer">
            New Bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          products={catalogue}
          onFound={handleBarcodeFound}
          scanFeedback={scanFeedback}
          onClose={() => {
            setShowScanner(false);
            setScanFeedback(null);
            isScanningProcessingRef.current = false;
            lastAcceptedScanRef.current = { barcode: null, timestamp: 0 };
          }}
        />
      )}

      {/* Toast Notification */}
      {toast.msg && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-xs sm:text-sm transition-all ${
          toast.type === "error"
            ? "bg-rose-600 text-white border-rose-700"
            : "bg-slate-900 text-white border-slate-700"
        }`}>
          <span className={toast.type === "error" ? "text-rose-200 font-bold" : "text-emerald-400 font-bold"}>
            {toast.type === "error" ? "!" : "✓"}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main page wrapper */}
      <div className="space-y-4 max-w-7xl mx-auto pb-12">

        {catalogLoading && <p className="text-xs text-blue-600 font-semibold pt-1">Loading products from server...</p>}
        {catalogError && <p className="text-xs text-rose-600 font-bold pt-1" role="alert">Products: {catalogError}</p>}

        {/* STICKY CURRENT BILL TOTAL BANNER */}
        <div className="sticky top-0 z-30" style={{ willChange: "transform" }}>
          <div className="bg-gradient-to-r from-[#102A56] via-[#1a3a6e] to-[#102A56] rounded-2xl overflow-hidden shadow-lg px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-500/30 border border-blue-400/30 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-blue-200">CURRENT BILL TOTAL</p>
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mt-0.5">
                  &#8377;{formatINR(grandTotal)}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-white">{items.length} {items.length === 1 ? "item" : "items"}</p>
              <p className="text-[11px] text-blue-200 font-medium mt-0.5">
                Total Quantity: {items.reduce((s, i) => s + i.qty, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH + SCAN BARCODE + CATEGORY PILLS */}
        <div ref={searchContainerRef} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                ref={searchRef}
                id="qb-product-search"
                type="text"
                placeholder="Search product name, SKU or scan barcode..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDrop(true);
                }}
                onFocus={() => {
                  if (productSearch.trim() || selectedCategory !== "ALL") {
                    setShowProductDrop(true);
                  }
                }}
                autoComplete="off"
                className="w-full pl-9 pr-9 py-3 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch("");
                    if (selectedCategory === "ALL") setShowProductDrop(false);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  &#10005;
                </button>
              )}

              {/* Search Dropdown */}
              {showProductDrop && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-80 flex flex-col">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200/80 space-y-2 shrink-0">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {selectedCategory === "ALL" ? "All Products" : selectedCategory} ({filteredProducts.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowProductDrop(false)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer px-2 py-0.5 rounded hover:bg-slate-200/60 transition-colors"
                      >
                        &#10005; Close
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                      {categories.map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                              active
                                ? "bg-[#102A56] text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-100">
                    {catalogLoading ? (
                      <p className="px-4 py-6 text-xs text-slate-400 text-center">Loading products&hellip;</p>
                    ) : filteredProducts.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-slate-500 text-center font-semibold">
                        {productSearch.trim()
                          ? `No products match "${productSearch}"`
                          : "No products in this category"}
                      </p>
                    ) : (
                      filteredProducts.map((p) => {
                        const inBill = items.find((it) => it.id === p.id);
                        const isOutOfStock = p.stock_quantity <= 0;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => {
                              addProduct(p);
                              if (productSearch.trim()) {
                                setProductSearch("");
                                setShowProductDrop(false);
                              }
                            }}
                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                              isOutOfStock
                                ? "opacity-40 cursor-not-allowed bg-slate-50"
                                : "hover:bg-blue-50/70 cursor-pointer"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                                {p.unit ? `per ${p.unit}` : (p.sku ? `SKU: ${p.sku}` : "")}
                                {isOutOfStock ? " · Out of stock" : p.stock_quantity <= p.low_stock_threshold ? ` · Only ${p.stock_quantity} left` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {inBill && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">&#215;{inBill.qty}</span>
                              )}
                              {p.has_offer && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Offer
                                </span>
                              )}
                              {p.has_offer && p.regular_price != null && (
                                <span className="text-xs text-slate-400 line-through font-medium">
                                  &#8377;{formatINR(p.regular_price)}
                                </span>
                              )}
                              <span className="text-sm font-black text-[#102A56]">&#8377;{formatINR(p.price)}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Scan Barcode Button */}
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="group inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white text-sm font-black shadow-md shadow-blue-500/25 ring-2 ring-blue-400/25 transition-all cursor-pointer shrink-0"
              title="Open Camera Barcode Scanner"
            >
              <svg className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0V8a4 4 0 00-4-4H8a4 4 0 00-4 4v12a4 4 0 004 4h8a4 4 0 004-4v-4" />
              </svg>
              <span className="hidden sm:inline">Scan Barcode</span>
              <span className="sm:hidden">Scan</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-100">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const isActiveFilter = isSelected && showProductDrop;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (isSelected && showProductDrop) {
                        setShowProductDrop(false);
                      } else {
                        setSelectedCategory(cat);
                        setShowProductDrop(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isActiveFilter
                        ? "bg-[#102A56] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {cat}
                    {cat !== "ALL" && (
                      <span
                        className={`text-[10px] px-1.5 rounded-full font-semibold ${
                          isActiveFilter ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-500"
                        }`}
                      >
                        {catalogue.filter((p) => p.category === cat).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SELECTED PRODUCTS TABLE with internal independent scroll */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Table Title Bar */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">Selected Products</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setItems([])}
                className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-700">No items selected yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Search a product by name or scan its barcode to add it to the bill.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-2.5 text-left font-black text-slate-600 uppercase tracking-wider w-8">#</th>
                        <th className="px-2 py-2.5 text-left font-black text-slate-600 uppercase tracking-wider">Product Name</th>
                        <th className="px-2 py-2.5 text-right font-black text-slate-600 uppercase tracking-wider w-20">Price (&#8377;)</th>
                        <th className="px-2 py-2.5 text-right font-black text-slate-600 uppercase tracking-wider w-20">Tax (&#8377;)</th>
                        <th className="px-2 py-2.5 text-center font-black text-slate-600 uppercase tracking-wider w-36">Qty</th>
                        <th className="px-2 py-2.5 text-right font-black text-slate-600 uppercase tracking-wider w-28">Discount (&#8377;)</th>
                        <th className="px-2 py-2.5 text-right font-black text-slate-600 uppercase tracking-wider w-24">Line Total (&#8377;)</th>
                        <th className="px-2 py-2.5 text-center font-black text-slate-600 uppercase tracking-wider w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const lineDiscount = Math.min(item.price * item.qty, Math.max(0, Number(item.disc) || 0));
                        const lineTotal = Math.max(0, item.price * item.qty - lineDiscount);
                        const pricing = resolveBillItemPricing(item);
                        const taxAmt = roundMoney(lineTotal * (Number(item.gst) || 0) / 100);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3 py-2.5 text-slate-500 font-semibold">{idx + 1}</td>
                            <td className="px-3 py-2.5">
                              <p className="font-bold text-slate-900 leading-snug">{item.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {pricing.hasOffer && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Offer</span>
                                )}
                                {pricing.hasOffer && (
                                  <span className="text-[10px] text-slate-400 line-through">&#8377;{formatINR(pricing.regularPrice)}</span>
                                )}
                                <span className="text-[10px] text-slate-500">&#8377;{formatINR(pricing.effectivePrice)}{item.unit ? ` / ${item.unit}` : ""}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-right font-bold text-slate-700">{formatINR(item.price)}</td>
                            <td className="px-2 py-2.5 text-right text-slate-600 font-semibold">{formatINR(taxAmt)}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center rounded-lg border border-slate-300/80 bg-white p-0.5 w-[96px] mx-auto">
                                <button
                                  type="button"
                                  onClick={() => updateQty(item.id, -1)}
                                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm cursor-pointer active:scale-95"
                                  aria-label="Decrease quantity"
                                >
                                  &#8722;
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => setItemQty(item.id, e.target.value)}
                                  className="w-full text-center text-xs font-black text-slate-900 bg-transparent outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQty(item.id, 1)}
                                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm cursor-pointer active:scale-95"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="relative w-24 ml-auto">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.disc === 0 ? "" : item.disc}
                                  onChange={(e) => updateDisc(item.id, e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-2 py-1.5 text-right text-xs font-bold text-rose-600 bg-rose-50/50 border border-rose-200 rounded-lg outline-none focus:border-rose-400"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-right font-black text-slate-900">{formatINR(lineTotal)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                                title="Remove item from bill"
                                aria-label={`Remove ${item.name} from bill`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: compact scrollable table (same structure as desktop, horizontal scroll only) */}
              <div className="sm:hidden overflow-x-auto" style={{ maxHeight: "340px", overflowY: "auto" }}>
                <table className="text-xs border-collapse" style={{ minWidth: "560px", width: "100%" }}>
                  <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-2 text-left font-black text-slate-600 uppercase tracking-wider" style={{ width: "28px" }}>#</th>
                      <th className="px-2 py-2 text-left font-black text-slate-600 uppercase tracking-wider" style={{ minWidth: "110px" }}>Product Name</th>
                      <th className="px-2 py-2 text-right font-black text-slate-600 uppercase tracking-wider" style={{ width: "64px" }}>Price</th>
                      <th className="px-2 py-2 text-right font-black text-slate-600 uppercase tracking-wider" style={{ width: "52px" }}>Tax</th>
                      <th className="px-2 py-2 text-center font-black text-slate-600 uppercase tracking-wider" style={{ width: "90px" }}>Qty</th>
                      <th className="px-2 py-2 text-right font-black text-slate-600 uppercase tracking-wider" style={{ width: "72px" }}>Disc.</th>
                      <th className="px-2 py-2 text-right font-black text-slate-600 uppercase tracking-wider" style={{ width: "68px" }}>Total</th>
                      <th className="px-2 py-2 text-center font-black text-slate-600 uppercase tracking-wider" style={{ width: "36px" }}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const lineDiscount = Math.min(item.price * item.qty, Math.max(0, Number(item.disc) || 0));
                      const lineTotal = Math.max(0, item.price * item.qty - lineDiscount);
                      const pricing = resolveBillItemPricing(item);
                      const taxAmt = roundMoney(lineTotal * (Number(item.gst) || 0) / 100);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-2 py-2 text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                            {pricing.hasOffer && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Offer</span>
                                <span className="text-[9px] text-slate-400 line-through">&#8377;{formatINR(pricing.regularPrice)}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-slate-700 whitespace-nowrap">
                            {formatINR(item.price)}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-600 font-semibold whitespace-nowrap">
                            {formatINR(taxAmt)}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center rounded-lg border border-slate-300/80 bg-white" style={{ minWidth: "82px" }}>
                              <button type="button" onClick={() => updateQty(item.id, -1)}
                                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer active:scale-95 shrink-0"
                                aria-label="Decrease quantity">&#8722;</button>
                              <input type="number" min="1" value={item.qty}
                                onChange={(e) => setItemQty(item.id, e.target.value)}
                                className="w-8 text-center text-xs font-black text-slate-900 bg-transparent outline-none" />
                              <button type="button" onClick={() => updateQty(item.id, 1)}
                                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer active:scale-95 shrink-0"
                                aria-label="Increase quantity">+</button>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0"
                              value={item.disc === 0 ? "" : item.disc}
                              onChange={(e) => updateDisc(item.id, e.target.value)}
                              placeholder="0.00"
                              className="w-full px-1.5 py-1 text-right text-xs font-bold text-rose-600 bg-rose-50/50 border border-rose-200 rounded-lg outline-none focus:border-rose-400" />
                          </td>
                          <td className="px-2 py-2 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatINR(lineTotal)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => removeItem(item.id)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100/70 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                              title="Remove" aria-label={`Remove ${item.name}`}>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Shared footer: item count + total qty — shown below both desktop and mobile tables */}
              <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{items.length} items selected</span>
                <span>Total Quantity: {items.reduce((s, i) => s + i.qty, 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* CUSTOMER INFO (left) + BILLING SUMMARY (right) — Desktop 2-column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* LEFT: Customer Information */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Customer Information</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium hidden sm:block">
                    {showCustomer ? "Specific Customer" : "Walk-in Customer"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showCustomer}
                    aria-controls="customer-info-panel"
                    onClick={() => setShowCustomer((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${
                      showCustomer ? "bg-blue-600" : "bg-slate-200"
                    }`}
                    title={showCustomer ? "Switch to Walk-in Customer" : "Add customer details"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
                        showCustomer ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div id="customer-info-panel" className="px-4 sm:px-5 pb-4 pt-3">
                {!showCustomer && (
                  <div className="flex items-center justify-between text-xs text-slate-500 py-1.5">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Walk-in Customer &bull; No customer details required
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomer(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      + Add Customer
                    </button>
                  </div>
                )}

                {showCustomer && (
                  <>
                    {selectedCustomer && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5 mb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700">&#10003; Customer Identified</p>
                            <p className="text-xs font-black text-slate-900">{selectedCustomer.name}</p>
                            <p className="text-xs font-mono text-slate-600">{customerPhone}</p>
                          </div>
                          <span className="text-[9px] font-bold text-blue-700 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                            {selectedCustomer.type || "Customer"}
                          </span>
                        </div>
                        {selectedCustomer.kadanBalance !== null && selectedCustomer.kadanBalance !== undefined && (
                          <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-semibold">Existing Credit (Kadan):</span>
                            <span className="font-bold text-rose-600">&#8377;{formatINR(selectedCustomer.kadanBalance)}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={changeCustomer}
                          className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer pt-1 block"
                        >
                          Change Customer
                        </button>
                      </div>
                    )}

                    {!selectedCustomer && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Customer Name */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Customer Name {paymentMethod === "kadan" ? <span className="text-rose-600">*</span> : <span className="text-slate-400">(optional)</span>}
                          </label>
                          <input
                            type="text"
                            placeholder="Enter customer name"
                            value={customerName}
                            onChange={handleCustomerNameChange}
                            onBlur={() => setNameTouched(true)}
                            className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium ${
                              nameValidationError ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                            }`}
                          />
                          {nameValidationError && (
                            <span className="mt-1 block text-[10px] font-bold text-rose-600" role="alert">
                              {nameValidationError}
                            </span>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Phone Number {paymentMethod === "kadan" ? <span className="text-rose-600">*</span> : <span className="text-slate-400">(optional)</span>}
                          </label>
                          <input
                            ref={customerPhoneRef}
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="Enter phone number"
                            value={customerPhone}
                            onChange={handlePhoneChange}
                            onBlur={() => setPhoneTouched(true)}
                            className={`w-full px-3 py-2.5 text-sm bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium ${
                              phoneValidationError ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                            }`}
                          />
                          {phoneValidationError && (
                            <span className="mt-1 block text-[10px] font-bold text-rose-600" role="alert">
                              {phoneValidationError}
                            </span>
                          )}
                          {customerLoading && <p className="text-[10px] text-blue-600 font-semibold mt-1">Checking customer registry...</p>}
                        </div>

                        {/* Multiple customer matches dropdown */}
                        {customerLookup === "multiple" && (
                          <div className="sm:col-span-2 rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50">Select customer:</p>
                            {customerMatches.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => selectCustomer(c)}
                                className="w-full flex items-center justify-between p-2 text-left hover:bg-blue-50 text-xs"
                              >
                                <span className="font-bold text-slate-800">{c.name}</span>
                                <span className="text-[11px] text-slate-500">{c.phone}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Billing Summary + Payment Details + Payment Method + Actions */}
          <div className="lg:col-span-5 space-y-3">

            {/* ── BILLING SUMMARY CARD ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-black text-slate-900">Billing Summary</h3>
              </div>
              <div className="px-4 py-3 space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm text-slate-700">
                  <span className="font-medium">Subtotal ({items.length} items)</span>
                  <span className="font-black text-slate-900">&#8377;{formatINR(subtotal)}</span>
                </div>
                {/* Additional Discount toggle */}
                <div className="flex justify-between items-center text-sm text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Additional Discount</span>
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === "amount" ? "percent" : "amount")}
                      className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                      title="Toggle ₹ / %"
                    >
                      {discountType === "amount" ? "- &#8377;" : "- %"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-rose-600 font-bold text-xs">-</span>
                    <input
                      type="number" min="0"
                      value={discountValue === 0 ? "" : discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-20 text-right text-xs font-bold text-rose-600 bg-rose-50/50 border border-rose-200 rounded-lg px-2 py-1 outline-none focus:border-rose-400"
                    />
                  </div>
                </div>
                {/* Total Discount */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 font-medium">Total Discount</span>
                  <span className="font-black text-rose-600">- &#8377;{formatINR(totalDiscount)}</span>
                </div>
                {/* Offer savings */}
                {totalOfferSavings > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                    <span>Offer Savings</span>
                    <span>- &#8377;{formatINR(totalOfferSavings)}</span>
                  </div>
                )}
                {/* GST / Tax */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 font-medium">GST / Tax</span>
                  <span className="font-black text-slate-900">&#8377;{formatINR(estimatedTax)}</span>
                </div>
                {/* PAYABLE AMOUNT */}
                <div className="rounded-xl bg-[#0B192C] text-white flex justify-between items-center px-4 py-3 mt-1">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-200">PAYABLE AMOUNT</span>
                  <span className="text-xl font-black text-white tracking-tight">&#8377;{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* ── PAYMENT DETAILS CARD ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-sm font-black text-slate-900">Payment Details</h3>
              </div>
              <div className="px-4 py-3 space-y-3">
                {/* Received Amount */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-700 shrink-0">
                    Received Amount (&#8377;)
                    {paymentMethod === "kadan" && (
                      <span className="block text-[10px] text-slate-400 font-normal">Advance payment if any</span>
                    )}
                  </label>
                  <input
                    type="number" min="0"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="Enter received amount"
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-right font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 placeholder-slate-400"
                  />
                </div>
                {grandTotal > 0 && appliedReceived <= 0.005 && paymentMethod !== "kadan" && (
                  <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No amount received. This bill will be recorded as Credit (கடன்).
                  </p>
                )}
                {/* Balance Amount uses the same normalized calculation as submission. */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-rose-700">Balance Amount (&#8377;)</span>
                  <span className="font-black text-rose-600 text-base">&#8377;{formatINR(creditAmount)}</span>
                </div>
                {paymentMethod === "kadan" && grandTotal > 0 && creditAmount <= 0.005 && (
                  <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No Kadan balance remains. Select Cash or UPI to record a fully paid bill.
                  </p>
                )}

                {/* Change due */}
                {paymentMethod === "cash" && changeDue > 0 && (
                  <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800">Change Due to Customer:</span>
                    <span className="text-sm font-black text-emerald-600">&#8377;{formatINR(changeDue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── PAYMENT METHOD CARD ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-sm font-black text-slate-900">Payment Method</h3>
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = paymentMethod === pm.key;
                    return (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(pm.key);
                          if (pm.key === "kadan") setShowCustomer(true);
                        }}
                        className={`relative py-3 px-2 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? pm.key === "kadan"
                              ? "bg-rose-50 border-rose-400 text-rose-700"
                              : pm.key === "cash"
                                ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                                : "bg-blue-50 border-blue-400 text-blue-800"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {/* Selected checkmark badge */}
                        {isSelected && (
                          <span className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black ${
                            pm.key === "kadan" ? "bg-rose-500" : pm.key === "cash" ? "bg-emerald-500" : "bg-blue-500"
                          }`}>✓</span>
                        )}
                        <div className={isSelected
                          ? pm.key === "kadan" ? "text-rose-600" : pm.key === "cash" ? "text-emerald-600" : "text-blue-600"
                          : "text-slate-400"
                        }>
                          {pm.icon}
                        </div>
                        <span className={`text-xs font-black ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                          {pm.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── GENERATE & PRINT BILL ── */}
            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={isSubmitting || items.length === 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving Bill...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Generate &amp; Print Bill
                </>
              )}
            </button>

            {/* ── CANCEL / RESET ── */}
            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Cancel / Reset Bill
            </button>

          </div>

        </div>{/* end 2-column grid */}

      </div>
    </>
  );
}
