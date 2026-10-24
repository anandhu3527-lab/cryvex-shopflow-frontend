import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { productApi } from "../../services/api/productApi";
import { productDataService } from "../../services/data/productDataService";
import { normalizeTaxRate } from "../../validations/productValidation";

// Available package units (matching AddProduct.jsx)
const PACKAGE_UNITS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "l", label: "Litres (l)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "pkt", label: "Packets (pkt)" },
  { value: "bag", label: "Bags (bag)" },
  { value: "cup", label: "Cups (cup)" },
  { value: "box", label: "Boxes (box)" },
  { value: "can", label: "Cans (can)" },
  { value: "bottle", label: "Bottles (bottle)" },
  { value: "bundle", label: "Bundles (bundle)" },
];

// Common GST Tax Rates in India (matching AddProduct.jsx)
const TAX_RATES = [
  { value: "", label: "Select Tax Rate (Optional)" },
  { value: 0, label: "0% (Exempt / Nil)" },
  { value: 5, label: "5% (Essential Commodities)" },
  { value: 18, label: "18% (Standard Rate)" },
  { value: 40, label: "40% (Special / Cess)" },
];

function BarcodeScanner({ onFound, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const detectorRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const foundRef = useRef(false);
  const mountedRef = useRef(true);

  const [scanState, setScanState] = useState("requesting");

  const isValidBarcode = (value) => {
    if (!value || typeof value !== "string") return false;
    return /^\d+$/.test(value.trim().replace(/\s/g, ""));
  };

  const stopCamera = useCallback(() => {
    if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (zxingReaderRef.current) { try { zxingReaderRef.current.reset(); } catch { /* ignore reset */ } zxingReaderRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  const handleDetected = useCallback((rawValue) => {
    if (foundRef.current || !mountedRef.current) return;
    const cleaned = String(rawValue).trim().replace(/\s/g, "");
    if (!isValidBarcode(cleaned)) return;
    foundRef.current = true;
    stopCamera();
    onFound(cleaned);
  }, [onFound, stopCamera]);

  const startNativeScanLoop = useCallback((video) => {
    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf", "code_39"],
    });
    detectorRef.current = detector;
    const loop = () => {
      if (!mountedRef.current || foundRef.current) return;
      if (!video || video.readyState < 2) { frameRef.current = requestAnimationFrame(loop); return; }
      detector.detect(video)
        .then((codes) => {
          if (!mountedRef.current || foundRef.current) return;
          const raw = codes[0]?.rawValue;
          if (raw) { handleDetected(raw); } else { frameRef.current = requestAnimationFrame(loop); }
        })
        .catch(() => { if (!mountedRef.current || foundRef.current) return; frameRef.current = requestAnimationFrame(loop); });
    };
    loop();
  }, [handleDetected]);

  const startZxingScanner = useCallback(async (stream) => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (!mountedRef.current || foundRef.current) return;
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }
      reader.decodeFromStream(stream, videoRef.current, (result) => {
        if (!mountedRef.current || foundRef.current || !result) return;
        handleDetected(result.getText());
      });
    } catch {
      if (mountedRef.current) setScanState("error");
    }
  }, [handleDetected]);

  useEffect(() => {
    mountedRef.current = true;
    foundRef.current = false;
    let localStream = null;

    async function initCamera() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setScanState("unsupported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream = stream;
        streamRef.current = stream;
        setScanState("scanning");

        if ("BarcodeDetector" in window) {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => { });
            startNativeScanLoop(videoRef.current);
          }
        } else {
          startZxingScanner(stream);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setScanState("denied");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setScanState("nocamera");
        } else {
          setScanState("error");
        }
      }
    }

    initCamera();

    return () => {
      mountedRef.current = false;
      stopCamera();
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
    };
  }, [startNativeScanLoop, startZxingScanner, stopCamera]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scanner"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-fade-in"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
            ▣
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">Scan Product Barcode</h2>
            <p className="text-[11px] text-slate-400">Point your camera at any UPC, EAN, or Code-128 barcode</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5 pb-8">
        {scanState === "requesting" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full border-4 border-blue-500/30 border-t-blue-400 animate-spin" />
            <p className="text-sm text-slate-300">Requesting camera access...</p>
          </div>
        )}

        {scanState === "scanning" && (
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: "4/3" }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative w-64 h-40 z-10">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br" />
                <span className="absolute left-1 right-1 h-0.5 bg-blue-400/80 rounded animate-pulse" />
              </div>
            </div>
            <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-black/60 text-[11px] text-blue-300 font-medium tracking-wide">
                Scanning…
              </span>
            </div>
          </div>
        )}

        {scanState !== "scanning" && scanState !== "requesting" && (
          <div className="max-w-sm text-center flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-rose-400">
              {scanState === "denied" ? "Camera access was denied" : "Camera unavailable"}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please check camera permissions in your browser or enter the barcode manually.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          {scanState !== "scanning" && scanState !== "requesting" ? "Enter Barcode Manually" : "Cancel Scanning"}
        </button>
      </div>
    </div>
  );
}

export default function AddProductVariant() {
  const { productId: routeProductId } = useParams();
  const location = useLocation();

  // Parent product state
  const [product, setProduct] = useState(() => location.state?.product || null);
  const [selectedProductId, setSelectedProductId] = useState(() => routeProductId || location.state?.product?.id || "");
  const [availableProducts, setAvailableProducts] = useState([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [productLoadError, setProductLoadError] = useState("");

  // Variant form fields
  const [variantForm, setVariantForm] = useState({
    package_quantity: 1,
    unit: "kg",
    barcode: "",
    sku: "",
    selling_price: "",
    offer_price: "",
    tax_rate: "",
    stock_quantity: "",
    low_stock_threshold: "10",
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [successResult, setSuccessResult] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Load product details if missing
  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      if (selectedProductId && (!product || String(product.id) !== String(selectedProductId))) {
        try {
          setIsLoadingProduct(true);
          setProductLoadError("");
          const res = await productApi.getProductById(selectedProductId);
          const data = res?.data?.data || res?.data || res;
          if (isMounted && data) {
            setProduct(data);
          }
        } catch (err) {
          if (isMounted) {
            setProductLoadError(err?.message || "Could not load selected product details.");
          }
        } finally {
          if (isMounted) setIsLoadingProduct(false);
        }
      }
    }

    loadProduct();
    return () => { isMounted = false; };
  }, [selectedProductId, product]);

  // Load list of all products if no product was selected initially
  useEffect(() => {
    let isMounted = true;
    if (!selectedProductId) {
      productDataService.getProducts().then((list) => {
        if (isMounted && Array.isArray(list)) {
          setAvailableProducts(list);
        }
      }).catch(() => { });
    }
    return () => { isMounted = false; };
  }, [selectedProductId]);

  const handleFieldChange = (field, value) => {
    setVariantForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!selectedProductId) {
      errors.product = "Please select a parent product first.";
    }

    const pkgQty = Number(variantForm.package_quantity);
    if (!variantForm.package_quantity || Number.isNaN(pkgQty) || pkgQty <= 0) {
      errors.package_quantity = "Package quantity must be greater than 0.";
    }

    if (!variantForm.unit) {
      errors.unit = "Please select a unit of measurement.";
    }

    const selling = Number(variantForm.selling_price);
    if (variantForm.selling_price === "" || Number.isNaN(selling) || selling < 0) {
      errors.selling_price = "Selling price must be a valid non-negative number.";
    }

    if (variantForm.offer_price !== "" && variantForm.offer_price !== null) {
      const offer = Number(variantForm.offer_price);
      if (Number.isNaN(offer) || offer < 0) {
        errors.offer_price = "Offer price must be a valid non-negative number.";
      } else if (offer > selling) {
        errors.offer_price = "Offer price cannot exceed selling price.";
      }
    }

    const stock = Number(variantForm.stock_quantity);
    if (variantForm.stock_quantity === "" || Number.isNaN(stock) || stock < 0) {
      errors.stock_quantity = "Stock quantity must be a non-negative number.";
    }

    const threshold = Number(variantForm.low_stock_threshold);
    if (variantForm.low_stock_threshold === "" || Number.isNaN(threshold) || threshold < 0) {
      errors.low_stock_threshold = "Low stock alert threshold is required (0 or greater).";
    }

    if (variantForm.barcode && !/^\d+$/.test(variantForm.barcode.trim())) {
      errors.barcode = "Barcode should only contain numbers.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      setSubmissionError("Please correct the errors highlighted below before proceeding.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const payload = {
        package_quantity: Number(variantForm.package_quantity),
        unit: variantForm.unit,
        barcode: variantForm.barcode ? String(variantForm.barcode).trim() : null,
        sku: variantForm.sku ? String(variantForm.sku).trim() : null,
        selling_price: Number(variantForm.selling_price),
        offer_price: variantForm.offer_price !== "" && variantForm.offer_price != null ? Number(variantForm.offer_price) : null,
        tax_rate: normalizeTaxRate(variantForm.tax_rate),
        stock_quantity: Number(variantForm.stock_quantity),
        low_stock_threshold: Number(variantForm.low_stock_threshold),
      };

      const result = await productDataService.createProductVariant(selectedProductId, payload);
      setSuccessResult(result);
    } catch (err) {
      const status = err?.status || err?.details?.status;
      const message = err?.data?.detail || err?.message || "Failed to create variant.";

      if (status === 409) {
        setSubmissionError("A variant with this barcode or SKU already exists. Please use a unique value.");
      } else if (status === 422) {
        setSubmissionError(typeof message === "string" ? message : "Invalid input parameters. Please check all fields.");
      } else {
        setSubmissionError(String(message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentProductName = product?.name || availableProducts.find((p) => String(p.id) === String(selectedProductId))?.name;
  const parentCategory = product?.category_name || product?.category?.name || product?.category || "Standard";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-16 px-3 sm:px-6">
      {/* ── Top Header matching AddProduct.jsx ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
              Inventory Extension
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
              New Variant
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
            Add Product Variant
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create an additional package size, SKU, or barcode for an existing product catalog item.
          </p>
        </div>

        <Link
          to={selectedProductId ? `/products/${selectedProductId}` : "/products"}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <span>← Back to Products</span>
        </Link>
      </div>

      {/* ── Success Modal / Notification ── */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 animate-fade-in shadow-sm">
          <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-md shadow-emerald-500/20">
            ✓
          </div>
          <div>
            <h2 className="text-lg font-black text-emerald-950">
              Variant Added Successfully!
            </h2>
            <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
              New variant ({variantForm.package_quantity} {variantForm.unit}) for{" "}
              <strong>"{parentProductName}"</strong> has been added to your live store catalog.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                setVariantForm({
                  package_quantity: 1,
                  unit: "kg",
                  barcode: "",
                  sku: "",
                  selling_price: "",
                  offer_price: "",
                  tax_rate: "",
                  stock_quantity: "",
                  low_stock_threshold: "10",
                });
              }}
              className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
            >
              + Add Another Variant
            </button>
            <Link
              to={selectedProductId ? `/products/${selectedProductId}` : "/products"}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              View Product Details →
            </Link>
          </div>
        </div>
      )}

      {/* ── Main Form ── */}
      {!successResult && (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* PARENT PRODUCT INFORMATION CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                  Step 1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  Parent Product
                </h2>
              </div>
              {parentProductName && (
                <span className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  {parentCategory}
                </span>
              )}
            </div>

            {isLoadingProduct ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading product information...
              </div>
            ) : productLoadError ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {productLoadError}
              </div>
            ) : selectedProductId && parentProductName ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-blue-600 font-black flex items-center justify-center shadow-2xs shrink-0 text-sm">
                    {parentProductName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{parentProductName}</h3>
                    <p className="text-xs text-slate-500">
                      ID: <span className="font-mono text-[11px] text-slate-600">{selectedProductId}</span>
                    </p>
                  </div>
                </div>

                {!routeProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId("");
                      setProduct(null);
                    }}
                    className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer self-start sm:self-auto"
                  >
                    Change Product
                  </button>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Select Parent Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                    formErrors.product ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                  }`}
                >
                  <option value="">Choose an existing product...</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category || "General"})
                    </option>
                  ))}
                </select>
                {formErrors.product && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{formErrors.product}</p>
                )}
              </div>
            )}
          </div>

          {/* VARIANT SPECIFICATIONS CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-2xs space-y-6">
            <div className="pb-3.5 border-b border-slate-100">
              <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                Step 2
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                Variant Details & Inventory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set packaging unit, pricing, barcodes, and inventory thresholds for this variant.
              </p>
            </div>

            {/* Error Banner */}
            {submissionError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold" role="alert">
                {submissionError}
              </div>
            )}

            {/* 2-Column Responsive Form Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Package Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Package Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={variantForm.package_quantity}
                  onChange={(e) => handleFieldChange("package_quantity", e.target.value)}
                  placeholder="e.g. 1"
                  className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                    formErrors.package_quantity ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                  }`}
                  required
                />
                {formErrors.package_quantity && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {formErrors.package_quantity}
                  </p>
                )}
              </div>

              {/* 2. Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Unit <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={variantForm.unit}
                    onChange={(e) => handleFieldChange("unit", e.target.value)}
                    className={`w-full appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                      formErrors.unit ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                    }`}
                  >
                    {PACKAGE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {formErrors.unit && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {formErrors.unit}
                  </p>
                )}
              </div>

              {/* 3. Barcode */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Barcode
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={variantForm.barcode}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      handleFieldChange("barcode", digits);
                    }}
                    placeholder="Enter numeric barcode"
                    className={`min-w-0 flex-1 px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all font-mono ${
                      formErrors.barcode ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 cursor-pointer"
                    aria-label="Scan barcode with camera"
                  >
                    <span aria-hidden="true">▣</span>
                    <span>Scan</span>
                  </button>
                </div>
                {formErrors.barcode ? (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.barcode}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">Optional • Numbers only (e.g. UPC, EAN)</p>
                )}
              </div>

              {/* 4. SKU */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    SKU
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <input
                  type="text"
                  value={variantForm.sku}
                  onChange={(e) => handleFieldChange("sku", e.target.value)}
                  placeholder="e.g. PROD-PACK-02"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all font-mono"
                />
              </div>

              {/* 5. Selling Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={variantForm.selling_price}
                    onChange={(e) => handleFieldChange("selling_price", e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all font-medium ${
                      formErrors.selling_price ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                    }`}
                    required
                  />
                </div>
                {formErrors.selling_price && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.selling_price}</p>
                )}
              </div>

              {/* 6. Offer Price */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Offer Price (₹)
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={variantForm.offer_price}
                    onChange={(e) => handleFieldChange("offer_price", e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                      formErrors.offer_price ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                    }`}
                  />
                </div>
                {formErrors.offer_price && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.offer_price}</p>
                )}
              </div>

              {/* 7. Tax Rate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Tax Rate (%)
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <div className="relative">
                  <select
                    value={variantForm.tax_rate}
                    onChange={(e) => handleFieldChange("tax_rate", e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
                  >
                    <option value="">Select Tax Rate (Optional)</option>
                    {TAX_RATES.filter((t) => t.value !== "").map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Optional • Defaults to 0% if unselected</p>
              </div>

              {/* 8. Stock Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Stock Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={variantForm.stock_quantity}
                  onChange={(e) => handleFieldChange("stock_quantity", e.target.value)}
                  placeholder="e.g. 50"
                  className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                    formErrors.stock_quantity ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                  }`}
                  required
                />
                {formErrors.stock_quantity && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.stock_quantity}</p>
                )}
              </div>

              {/* 9. Low Stock Threshold */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Low Stock Alert Threshold <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Required</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={variantForm.low_stock_threshold}
                  onChange={(e) => handleFieldChange("low_stock_threshold", e.target.value)}
                  placeholder="e.g. 10"
                  className={`w-full sm:max-w-xs px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                    formErrors.low_stock_threshold ? "border-rose-400 bg-rose-50/20" : "border-slate-200/90"
                  }`}
                  required
                />
                {formErrors.low_stock_threshold && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.low_stock_threshold}</p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <Link
                to={selectedProductId ? `/products/${selectedProductId}` : "/products"}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding Variant...</span>
                  </>
                ) : (
                  <>
                    <span>+ Add Variant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScanner
          onFound={(code) => {
            handleFieldChange("barcode", code);
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
