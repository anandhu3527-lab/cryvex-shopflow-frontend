import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { productDataService } from "../../services/data/productDataService";
import {
  validateCategory,
  validateFullProductForm,
  normalizeTaxRate,
} from "../../validations/productValidation";


// Available package units
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

// Common GST Tax Rates in India
const TAX_RATES = [
  { value: "", label: "No tax specified" },
  { value: 0, label: "0% (Exempt / Nil)" },
  { value: 5, label: "5% (Essential Commodities)" },
  { value: 12, label: "12% (Standard Low)" },
  { value: 18, label: "18% (Standard High)" },
  { value: 28, label: "28% (Luxury / Aerated)" },
];

function BarcodeScanner({ onFound, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const detectorRef = useRef(null);
  const [state, setState] = useState(() =>
    "BarcodeDetector" in window && navigator.mediaDevices?.getUserMedia
      ? "requesting"
      : "unsupported"
  );

  const stopCamera = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  useEffect(() => {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      return () => stopCamera();
    }

    detectorRef.current = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "qr_code"],
    });

    const scanLoop = () => {
      if (!videoRef.current || !detectorRef.current) return;
      if (videoRef.current.readyState < 2) {
        frameRef.current = requestAnimationFrame(scanLoop);
        return;
      }

      detectorRef.current
        .detect(videoRef.current)
        .then((barcodes) => {
          const value = barcodes[0]?.rawValue?.trim();
          if (value) {
            stopCamera();
            onFound(value);
            return;
          }
          frameRef.current = requestAnimationFrame(scanLoop);
        })
        .catch(() => {
          frameRef.current = requestAnimationFrame(scanLoop);
        });
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setState("scanning");
        scanLoop();
      })
      .catch((error) => {
        setState(error.name === "NotAllowedError" ? "denied" : "error");
      });

    return () => stopCamera();
  }, [onFound, stopCamera]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-base font-bold text-white">Scan Barcode</h2>
          <p className="text-xs text-slate-400 mt-0.5">Point the camera at the barcode</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close barcode scanner"
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
        >
          <span className="text-lg">×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5 pb-8">
        {state === "requesting" && <p className="text-sm text-slate-300">Requesting camera access...</p>}
        {state === "scanning" && (
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-40 border-2 border-blue-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        )}
        {(state === "unsupported" || state === "denied" || state === "error") && (
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold text-white">
              {state === "unsupported" ? "Camera scanning is not supported in this browser." : "Camera access could not be started."}
            </p>
            <p className="text-xs text-slate-400 mt-2">Close this window and type the barcode manually.</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20"
        >
          Enter Manually
        </button>
      </div>
    </div>
  );
}

export default function AddProduct() {
  const navigate = useNavigate();

  // Step state: 1 = Category, 2 = Product & Variants
  const [currentStep, setCurrentStep] = useState(1);

  // Available categories (initialized with cached / live data)
  const [categories, setCategories] = useState(() => productDataService.getCategoryList());
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // Load live categories from backend API on mount
  useEffect(() => {
    let isMounted = true;
    productDataService.fetchCategories().then((cats) => {
      if (isMounted && cats && cats.length > 0) {
        setCategories([...cats]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Category creation modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [categoryModalError, setCategoryModalError] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Product information form
  const [productInfo, setProductInfo] = useState({
    name: "",
    description: "",
  });
  const [productErrors, setProductErrors] = useState({});

  // Product variants list
  const [variants, setVariants] = useState([
    {
      id: "v-initial-1",
      package_quantity: 1,
      unit: "kg",
      barcode: "",
      sku: "",
      selling_price: "",
      offer_price: "",
      tax_rate: "",
      stock_quantity: "",
      low_stock_threshold: "",
    },
  ]);
  const [variantErrors, setVariantErrors] = useState([{}]);
  const [scanningVariantIndex, setScanningVariantIndex] = useState(null);

  // Submission & UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProductResult, setCreatedProductResult] = useState(null);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Find currently selected category object
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Generated API Payload (reactive for real-time inspection)
  const apiPayload = useMemo(() => {
    const payloadProduct = {
      name: productInfo.name.trim(),
      description: productInfo.description.trim() || null,
      category_id: selectedCategoryId || null,
    };

    return {
      product: payloadProduct,
      variants: variants.map((v) => ({
        package_quantity: Number(v.package_quantity || 0),
        unit: v.unit || "kg",
        barcode: v.barcode ? v.barcode.trim() : null,
        sku: v.sku ? v.sku.trim() : null,
        selling_price: Number(v.selling_price || 0),
        offer_price: v.offer_price !== "" && v.offer_price != null ? Number(v.offer_price) : null,
        tax_rate: v.tax_rate ? Number(v.tax_rate) : 0,

        stock_quantity: Number(v.stock_quantity || 0),
        low_stock_threshold: Number(v.low_stock_threshold || 0),
      })),
    };
  }, [productInfo, selectedCategoryId, variants]);

  // ==========================================
  // STEP 1: CATEGORY SELECTION HANDLERS
  // ==========================================
  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    if (categoryError) setCategoryError("");
  };

  const handleContinueToProductInfo = () => {
    const error = validateCategory(selectedCategoryId);
    if (error) {
      setCategoryError(error);
      return;
    }
    setCategoryError("");
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ==========================================
  // CONNECTED: CREATE CATEGORY API
  // POST /api/v1/categories
  // ==========================================
  const handleCreateNewCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryModalError("Category name is required");
      return;
    }

    setIsCreatingCategory(true);
    setCategoryModalError("");

    try {
      // Create category payload matching API Swagger schema
      const categoryPayload = {
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
      };

      // Calls live API POST /api/v1/categories with fallback
      const newCat = await productDataService.createCategory(categoryPayload);
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === newCat.id);
        return exists ? prev : [...prev, newCat];
      });
      setSelectedCategoryId(newCat.id);

      // Reset modal
      setNewCategoryName("");
      setNewCategoryDesc("");
      setShowCategoryModal(false);
      setCategoryError("");

      showToast(`Category "${newCat.name}" created successfully`);
    } catch (err) {
      setCategoryModalError(err?.message || "Failed to create category. Please try again.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // ==========================================
  // STEP 2: PRODUCT INFO HANDLERS
  // ==========================================
  const handleProductInfoChange = (field, value) => {
    setProductInfo((prev) => ({ ...prev, [field]: value }));
    if (productErrors[field]) {
      setProductErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ==========================================
  // STEP 3: DYNAMIC VARIANTS HANDLERS
  // ==========================================
  const handleAddVariant = () => {
    const nextNumber = variants.length + 1;
    const newVariant = {
      id: `v-${Date.now()}-${nextNumber}`,
      package_quantity: 1,
      unit: variants[0]?.unit || "kg",
      barcode: "",
      sku: "",
      selling_price: "",
      offer_price: "",
      tax_rate: variants[0]?.tax_rate ?? "",
      stock_quantity: "",
      low_stock_threshold: "",
    };

    setVariants((prev) => [...prev, newVariant]);
    setVariantErrors((prev) => [...prev, {}]);
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      showToast("At least one variant is required");
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
    setVariantErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Clear error for this field
    if (variantErrors[index] && variantErrors[index][field]) {
      setVariantErrors((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: undefined };
        return updated;
      });
    }
  };

  const handleBarcodeFound = useCallback((value) => {
    if (scanningVariantIndex !== null) {
      setVariants((prev) => {
        const updated = [...prev];
        updated[scanningVariantIndex] = {
          ...updated[scanningVariantIndex],
          barcode: value,
        };
        return updated;
      });
      setVariantErrors((prev) => {
        const updated = [...prev];
        updated[scanningVariantIndex] = {
          ...updated[scanningVariantIndex],
          barcode: undefined,
        };
        return updated;
      });
    }
    setScanningVariantIndex(null);
  }, [scanningVariantIndex]);

  // ==========================================
  // STEP 4: FORM SUBMISSION & API BUILD
  // CONNECTED: CREATE PRODUCT API
  // POST /api/v1/products
  // ==========================================
  const handleSubmitProduct = async (e) => {
    if (e) e.preventDefault();

    // 1. Validate complete form
    const validation = validateFullProductForm(
      { ...productInfo, category_id: selectedCategoryId },
      variants
    );

    if (!validation.isValid) {
      setProductErrors(validation.productErrors);
      setVariantErrors(validation.variantErrors);

      // Scroll to the first error
      const firstErrorElement = document.querySelector(".has-field-error");
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      showToast("Please correct the errors in the form before submitting.");
      return;
    }

    // 2. Build exact API payload as specified in Swagger screenshot
    const payload = {
      product: {
        name: productInfo.name.trim(),
        description: productInfo.description.trim() || null,
        category_id: selectedCategoryId,
      },
      variants: variants.map((v) => ({
        package_quantity: Number(v.package_quantity),
        unit: v.unit,
        barcode: v.barcode ? v.barcode.trim() : null,
        sku: v.sku ? v.sku.trim() : null,
        selling_price: Number(v.selling_price),
        offer_price: v.offer_price !== "" && v.offer_price != null ? Number(v.offer_price) : null,
        tax_rate: v.tax_rate ? Number(v.tax_rate) : 0,

        stock_quantity: Number(v.stock_quantity),
        low_stock_threshold: Number(v.low_stock_threshold),
      })),
    };

    setIsSubmitting(true);

    try {
      // 3. Submit to live backend API (POST /api/v1/products)
      const result = await productDataService.createProduct(payload);

      // 4. STEP 5: SUCCESS NOTIFICATION
      showToast(result?.message || "Product uploaded successfully");
      setCreatedProductResult(result.data);
      setShowSuccessModal(true);
    } catch (err) {
      showToast(err?.message || "Failed to upload product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Copy JSON Payload to clipboard
  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(apiPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Reset entire form
  const handleResetForm = () => {
    setCurrentStep(1);
    setSelectedCategoryId("");
    setProductInfo({ name: "", description: "" });
    setVariants([
      {
        id: `v-${Date.now()}-1`,
        package_quantity: 1,
        unit: "kg",
        barcode: "",
        sku: "",
        selling_price: "",
        offer_price: "",
        tax_rate: "",
        stock_quantity: "",
        low_stock_threshold: "",
      },
    ]);
    setProductErrors({});
    setVariantErrors([{}]);
    setShowSuccessModal(false);
    setCreatedProductResult(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {scanningVariantIndex !== null && (
        <BarcodeScanner
          onFound={handleBarcodeFound}
          onClose={() => setScanningVariantIndex(null)}
        />
      )}
      {/* Toast Feedback Notification (ShopFlow Slate Navy Style) */}
      {toastMessage && (
        <div
          className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs sm:text-sm"
          role="status"
          aria-live="polite"
        >
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
            ✓
          </span>
          <div className="flex flex-col">
            <span className="font-semibold">{toastMessage}</span>
            {toastMessage.includes("uploaded") && (
              <span className="text-[11px] text-slate-300">
                Your product and variants have been added.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
        <Link
          to="/products"
          className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Products</span>
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-semibold">Add Product</span>
        {selectedCategory && currentStep === 2 && (
          <>
            <span>/</span>
            <span className="text-blue-600 font-semibold">{selectedCategory.name}</span>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Add Product
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create a new inventory product with customized packaging, pricing, and variants.
          </p>
        </div>

        {/* Stepper indicator */}
        <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs self-start sm:self-auto">
          <div
            onClick={() => {
              if (currentStep === 2) setCurrentStep(1);
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentStep === 1
                ? "bg-slate-900 text-white"
                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/20">
              {currentStep === 2 ? "✓" : "1"}
            </span>
            <span>Category</span>
          </div>

          <span className="text-slate-300">→</span>

          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
              currentStep === 2
                ? "bg-slate-900 text-white"
                : "text-slate-400 bg-slate-50"
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 text-slate-700">
              2
            </span>
            <span>Product & Variants</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CATEGORY SELECTION                                               */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                  Step 1
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                  Select Product Category
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Every product must belong to a verified category. Select one below to proceed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <span className="text-sm font-bold text-blue-600">+</span>
                <span>Add Category</span>
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {/* Category Dropdown */}
              <div>
                <label
                  htmlFor="category-select"
                  className="block text-xs font-semibold text-slate-800 mb-2"
                >
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative max-w-lg">
                  <select
                    id="category-select"
                    value={selectedCategoryId}
                    onChange={(e) => handleSelectCategory(e.target.value)}
                    className={`w-full appearance-none pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                      categoryError
                        ? "border-rose-400 bg-rose-50/20 has-field-error"
                        : "border-slate-200/90"
                    }`}
                  >
                    <option value="">Select Category ▼</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {categoryError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{categoryError}</span>
                  </p>
                )}
              </div>

              {/* Fast Select Grid Cards */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Quick Select Category
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`text-left p-3 rounded-xl border transition-all relative ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 shadow-xs"
                            : "border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {cat.name}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {cat.description || "Catalogue category"}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                          ID: {cat.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected category preview panel */}
              {selectedCategory && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      ✓
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        {selectedCategory.name} Selected
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Internal ID: <code className="font-mono text-blue-600">{selectedCategory.id}</code>
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    Ready to proceed
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <Link
                  to="/products"
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Cancel
                </Link>

                <button
                  type="button"
                  id="category-continue-btn"
                  onClick={handleContinueToProductInfo}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all"
                >
                  <span>Continue</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2 & 3: PRODUCT INFORMATION & VARIANTS                                */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <form onSubmit={handleSubmitProduct} className="space-y-6">
          {/* SECTION 1: PRODUCT INFORMATION */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                  Step 2
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  Product Information
                </h2>
              </div>

              {/* Category Pill with change option */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  <span className="text-blue-500 font-bold">Category:</span>
                  <span>{selectedCategory?.name || "Selected Category"}</span>
                  <span className="text-blue-600 font-bold">✓</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-500 hover:text-blue-600 font-semibold underline underline-offset-2 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  value={productInfo.name}
                  onChange={(e) => handleProductInfoChange("name", e.target.value)}
                  placeholder="Enter product name (e.g. Premium Basmati Rice)"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                    productErrors.name
                      ? "border-rose-400 bg-rose-50/20 has-field-error"
                      : "border-slate-200/90"
                  }`}
                />
                {productErrors.name && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {productErrors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Description
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <textarea
                  id="product-description-input"
                  rows={3}
                  value={productInfo.description}
                  onChange={(e) => handleProductInfoChange("description", e.target.value)}
                  placeholder="Enter product details, specifications, packaging notes, etc."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all resize-y"
                />
              </div>

              {/* Readonly Category Field representation */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Category
                </label>
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {selectedCategory?.name}
                    </span>
                    <span className="text-emerald-600 font-bold">✓</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {selectedCategoryId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: PRODUCT VARIANTS (MOST IMPORTANT SECTION)                      */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                    Step 3
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
                    {variants.length} {variants.length === 1 ? "Variant" : "Variants"}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  Product Variants
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Each product can have multiple pack sizes, prices, and inventory units.
                </p>
              </div>

              <button
                type="button"
                id="add-variant-top-btn"
                onClick={handleAddVariant}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span>Add Variant</span>
              </button>
            </div>

            {/* List of Variant Cards */}
            <div className="space-y-5">
              {variants.map((variant, index) => {
                const errors = variantErrors[index] || {};
                const variantNumber = index + 1;
                const canRemove = variants.length > 1;

                return (
                  <div
                    key={variant.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:border-slate-300 transition-all shadow-2xs relative"
                  >
                    {/* Variant Card Header */}
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200/80">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                          {variantNumber}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          Variant {variantNumber}
                        </h3>
                        {index === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700">
                            Default
                          </span>
                        )}
                      </div>

                      {canRemove ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(index)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                          title="Remove this variant"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Remove</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Primary Variant (Required)
                        </span>
                      )}
                    </div>

                    {/* Variant Form 2-Column Responsive Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Package Quantity */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                          Package Quantity <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={variant.package_quantity}
                          onChange={(e) =>
                            handleVariantChange(index, "package_quantity", e.target.value)
                          }
                          placeholder="e.g. 1"
                          className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                            errors.package_quantity
                              ? "border-rose-400 bg-rose-50/20 has-field-error"
                              : "border-slate-200/90"
                          }`}
                        />
                        {errors.package_quantity && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.package_quantity}
                          </p>
                        )}
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                          Unit <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={variant.unit}
                            onChange={(e) =>
                              handleVariantChange(index, "unit", e.target.value)
                            }
                            className={`w-full appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                              errors.unit
                                ? "border-rose-400 bg-rose-50/20 has-field-error"
                                : "border-slate-200/90"
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
                        {errors.unit && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.unit}
                          </p>
                        )}
                      </div>

                      {/* Barcode */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-800">
                            Barcode <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] text-slate-400">Required</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={variant.barcode}
                            onChange={(e) =>
                              handleVariantChange(index, "barcode", e.target.value)
                            }
                            placeholder="Type barcode number"
                            className={`min-w-0 flex-1 px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                              errors.barcode
                                ? "border-rose-400 bg-rose-50/20 has-field-error"
                                : "border-slate-200/90"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setScanningVariantIndex(index)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                            aria-label="Scan barcode with camera"
                          >
                            <span aria-hidden="true">▣</span>
                            <span>Scan</span>
                          </button>
                        </div>
                        {errors.barcode && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.barcode}
                          </p>
                        )}
                      </div>

                      {/* SKU */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-800">
                            SKU
                          </label>
                          <span className="text-[11px] text-slate-400">Optional</span>
                        </div>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) =>
                            handleVariantChange(index, "sku", e.target.value)
                          }
                          placeholder="e.g. RICE-25KG-01"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all font-mono"
                        />
                      </div>

                      {/* Selling Price */}
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
                            value={variant.selling_price}
                            onChange={(e) =>
                              handleVariantChange(index, "selling_price", e.target.value)
                            }
                            placeholder="0.00"
                            className={`w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all font-medium ${
                              errors.selling_price
                                ? "border-rose-400 bg-rose-50/20 has-field-error"
                                : "border-slate-200/90"
                            }`}
                          />
                        </div>
                        {errors.selling_price && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.selling_price}
                          </p>
                        )}
                      </div>

                      {/* Offer Price */}
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
                            value={variant.offer_price}
                            onChange={(e) =>
                              handleVariantChange(index, "offer_price", e.target.value)
                            }
                            placeholder="0.00"
                            className={`w-full pl-7 pr-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                              errors.offer_price
                                ? "border-rose-400 bg-rose-50/20 has-field-error"
                                : "border-slate-200/90"
                            }`}
                          />
                        </div>
                        {errors.offer_price && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.offer_price}
                          </p>
                        )}
                      </div>

                      {/* Tax Rate (GST) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-800">
                            Tax Rate (%)
                          </label>
                          <span className="text-[11px] text-slate-400">Optional</span>
                        </div>
                        <div className="relative">
                          <select
                            value={variant.tax_rate}
                            onChange={(e) =>
                              handleVariantChange(index, "tax_rate", e.target.value)
                            }
                            className={`w-full appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                              errors.tax_rate
                                ? "border-rose-400 bg-rose-50/20 has-field-error"
                                : "border-slate-200/90"
                            }`}
                          >
                            {TAX_RATES.map((t) => (
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
                        {errors.tax_rate && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.tax_rate}
                          </p>
                        )}
                      </div>

                      {/* Stock Quantity */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                          Stock Quantity <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={variant.stock_quantity}
                          onChange={(e) =>
                            handleVariantChange(index, "stock_quantity", e.target.value)
                          }
                          placeholder="e.g. 50"
                          className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                            errors.stock_quantity
                              ? "border-rose-400 bg-rose-50/20 has-field-error"
                              : "border-slate-200/90"
                          }`}
                        />
                        {errors.stock_quantity && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.stock_quantity}
                          </p>
                        )}
                      </div>

                      {/* Low Stock Threshold */}
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
                          value={variant.low_stock_threshold}
                          onChange={(e) =>
                            handleVariantChange(index, "low_stock_threshold", e.target.value)
                          }
                          placeholder="e.g. 10 (Alert when stock reaches this level)"
                          className={`w-full sm:max-w-xs px-3 py-2 text-xs sm:text-sm bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all ${
                            errors.low_stock_threshold
                              ? "border-rose-400 bg-rose-50/20 has-field-error"
                              : "border-slate-200/90"
                          }`}
                        />
                        {errors.low_stock_threshold && (
                          <p className="mt-1 text-[11px] text-rose-600 font-medium">
                            {errors.low_stock_threshold}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Big "+ Add Variant" Dynamic Action Button */}
            <button
              type="button"
              id="add-variant-btn"
              onClick={handleAddVariant}
              className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 text-blue-600 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all group"
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-xs font-bold transition-colors">
                +
              </span>
              <span>Add Another Variant (Size, Packaging, Price)</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* STEP 4: SUBMISSION BUTTON & ACTIONS                                       */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Back to Category</span>
              </button>

              <button
                type="button"
                onClick={() => setShowJsonInspector(!showJsonInspector)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                title="View Swagger API payload"
              >
                {showJsonInspector ? "Hide API Payload" : "Inspect Payload"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/products"
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                id="submit-product-btn"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all shrink-0 min-w-[150px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Product</span>
                    <span>✓</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-time Swagger JSON Payload Preview Drawer */}
          {showJsonInspector && (
            <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400">
                    POST /api/v1/products
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    (Swagger Contract Validated)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition-colors"
                >
                  {copiedJson ? "Copied! ✓" : "Copy Payload"}
                </button>
              </div>
              <pre className="text-[11px] font-mono overflow-x-auto text-emerald-300 p-2 bg-slate-950/60 rounded-xl max-h-72">
                {JSON.stringify(apiPayload, null, 2)}
              </pre>
            </div>
          )}
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: SUCCESS MODAL / DIALOG                                            */}
      {/* ========================================================================= */}
      {showSuccessModal && createdProductResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-5 animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
              ✓
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Product Uploaded Successfully
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Your product and {createdProductResult.variants?.length || 1} variant(s) have been added to ShopFlow inventory.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Product Name:</span>
                <span className="font-semibold text-slate-900">{createdProductResult.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-900">{createdProductResult.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Variants:</span>
                <span className="font-semibold text-slate-900">{createdProductResult.variants?.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Primary Price:</span>
                <span className="font-bold text-blue-600">₹{createdProductResult.price.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
              >
                + Add Another
              </button>

              <button
                type="button"
                onClick={() => navigate("/products")}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
              >
                View Products →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY CREATION MODAL (POST /api/v1/categories)                          */}
      {/* ========================================================================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Category</h3>
                <p className="text-[11px] text-slate-500">
                  Matches API: POST /api/v1/categories
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Organic Pulses, Frozen Foods"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Short description of items in this category"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs resize-none"
                />
              </div>

              {categoryModalError && (
                <p className="text-xs text-rose-600 font-medium">{categoryModalError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingCategory}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isCreatingCategory ? "Saving..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
