import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { productDataService } from "../../services/data/productDataService";
import { customerDataService } from "../../services/data/customerDataService";
import { kadanDataService } from "../../services/data/kadanDataService";
import { billingApi } from "../../services/api/billingApi";

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
];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function formatINR(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

/* ─────────────────────────────────────────────────────────────────────────────
   BARCODE SCANNER MODAL
───────────────────────────────────────────────────────────────────────────── */
function BarcodeScanner({ products, onFound, onClose, scanFeedback }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const detectorRef = useRef(null);
  const lastScanRef = useRef({ barcode: null, time: 0 });

  const [state, setState] = useState(() => "BarcodeDetector" in window ? "requesting" : "unsupported");

  const stopCamera = useCallback(() => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => { stopCamera(); onClose(); }, [stopCamera, onClose]);

  useEffect(() => {
    // Check BarcodeDetector support
    if (!("BarcodeDetector" in window)) {
      return;
    }
    detectorRef.current = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a"] });

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
      .catch((err) => {
        setState(err.name === "NotAllowedError" ? "denied" : "error");
      });

    function scanLoop() {
      if (!videoRef.current || !detectorRef.current) return;
      if (videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      detectorRef.current
        .detect(videoRef.current)
        .then((barcodes) => {
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            const now = Date.now();
            if (raw !== lastScanRef.current.barcode || (now - lastScanRef.current.time > 2000)) {
              lastScanRef.current = { barcode: raw, time: now };
              onFound(raw);
            }
          }
          rafRef.current = requestAnimationFrame(scanLoop);
        })
        .catch(() => { rafRef.current = requestAnimationFrame(scanLoop); });
    }

    return () => stopCamera();
  }, [onFound, products, stopCamera]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-base font-bold text-white">Barcode Scanner</h2>
          <p className="text-xs text-slate-400 mt-0.5">Point camera at product barcode</p>
        </div>
        <button type="button" onClick={handleClose}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Camera / state area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-5">
        {(state === "requesting") && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm">Requesting camera access…</p>
          </div>
        )}

        {state === "scanning" && (
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {/* Scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                {/* Corner markers */}
                {["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"].map((pos, i) => (
                  <span key={i} className={`absolute w-7 h-7 border-blue-400 ${pos} ${
                    i === 0 ? "border-t-2 border-l-2 rounded-tl-md"
                    : i === 1 ? "border-t-2 border-r-2 rounded-tr-md"
                    : i === 2 ? "border-b-2 border-l-2 rounded-bl-md"
                    : "border-b-2 border-r-2 rounded-br-md"
                  }`} />
                ))}
                {/* Scanning line */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400/70 animate-pulse" />
              </div>
            </div>
            {/* Scan label */}
            <div className="absolute bottom-3 inset-x-0 text-center">
              <span className="text-xs text-white/70 bg-black/40 px-3 py-1 rounded-full">Scanning continuously…</span>
            </div>
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
            <p className="text-xs text-slate-400">Use Chrome or Edge browser for barcode scanning. You can still search products manually.</p>
            <button onClick={handleClose} className="mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors">Close</button>
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
            <p className="text-xs text-slate-400">Please allow camera access in your browser settings, then try again.</p>
            <button onClick={handleClose} className="mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors">Close</button>
          </div>
        )}

        {state === "error" && (
          <div className="text-center space-y-3 max-w-xs">
            <p className="text-sm font-semibold text-white">Camera error</p>
            <p className="text-xs text-slate-400">Could not access camera. Please check your device settings.</p>
            <button onClick={handleClose} className="mt-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors">Close</button>
          </div>
        )}

        {/* Scan feedback */}
        {scanFeedback && state === "scanning" && (
          <div className="w-full max-w-sm px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 backdrop-blur-sm text-center">
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

  /* ── Customer Details ── */
  const [showCustomer,     setShowCustomer]     = useState(true);
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
  const [paymentMethod,  setPaymentMethod]  = useState("");

  /* ── Payment Card Slide/Swipe Up Animation ── */
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentSettled, setPaymentSettled] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      const reveal = requestAnimationFrame(() => {
        setPaymentVisible(true);
        requestAnimationFrame(() => {
          setPaymentSettled(true);
        });
      });
      return () => cancelAnimationFrame(reveal);
    } else {
      const reset = requestAnimationFrame(() => setPaymentSettled(false));
      const t = setTimeout(() => setPaymentVisible(false), 400);
      return () => {
        cancelAnimationFrame(reset);
        clearTimeout(t);
      };
    }
  }, [items.length]);

  /* ── Barcode scanner ── */
  const [showScanner, setShowScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);

  /* ── Toast ── */
  const [toast, setToast] = useState({ msg: "", type: "success" });

  useEffect(() => {
    let isMounted = true;
    productDataService.getProducts()
      .then((data) => {
        const records = Array.isArray(data) ? data : data?.data || [];
        const variants = records.flatMap((product) => (product.variants || []).map((variant) => ({
          id: variant.id,
          variantId: variant.id,
          name: product.name,
          category: product.category,
          price: Number(variant.selling_price || 0),
          gst: Number(variant.tax_rate || 0),
          barcode: variant.barcode || "",
          sku: variant.sku || "",
          unit: variant.unit || "",
        })));
        if (isMounted) setCatalogue(variants);
      })
      .catch((error) => {
        if (isMounted) setCatalogError(error?.message || "Could not load products.");
      })
      .finally(() => {
        if (isMounted) setCatalogLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

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
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const gstAmount = items.reduce((s, i) => {
    const base = i.price * i.qty - i.disc;
    return s + (base * i.gst) / 100;
  }, 0);
  const discountAmt = discountType === "percent"
    ? (subtotal * Number(discountValue)) / 100
    : Number(discountValue) || 0;
  const grandTotal  = Math.max(0, subtotal - discountAmt + gstAmount);
  const received    = paymentMethod === "kadan" ? 0 : Number(receivedAmount) || 0;
  const balance     = grandTotal - received;

  /* ─── Filtered lists ───────────────────────────────────────────────── */
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return catalogue.slice(0, 6);
    const term = productSearch.toLowerCase();
    return catalogue.filter(
      (p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  }, [catalogue, productSearch]);

  /* ─── Actions ──────────────────────────────────────────────────────── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3200);
  }, []);

  const addProduct = useCallback((product) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1, disc: 0 }];
    });
    setProductSearch("");
    setShowProductDrop(false);
  }, []);

  const updateQty  = (id, d) => setItems((p) => p.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const updateDisc = (id, v) => setItems((p) => p.map((i) => i.id === id ? { ...i, disc: Math.max(0, Number(v)) } : i));
  const removeItem = (id)    => setItems((p) => p.filter((i) => i.id !== id));

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

  const handleBarcodeFound = useCallback(async (barcode) => {
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

      const product = {
        id: variant.id,
        variantId: variant.id,
        name: productData.name,
        category: productData.category,
        price: Number(variant.selling_price || 0),
        gst: Number(variant.tax_rate || 0),
        barcode: variant.barcode || barcode,
        sku: variant.sku || "",
        unit: variant.unit || "",
      };

      setItems((prev) => {
        const ex = prev.find((i) => i.id === product.id);
        const currentQty = ex ? ex.qty : 0;
        const newQty = currentQty + 1;
        
        if (currentStock > 0 && newQty > currentStock) {
          setScanFeedback(
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-amber-400">Product is out of stock.</span>
              <span className="text-slate-300 text-[10px]">{productData.name} (Max: {currentStock})</span>
            </div>
          );
          return prev;
        }

        setScanFeedback(
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-300 text-[10px] uppercase tracking-wider">Last scanned</span>
            <span className="font-bold text-emerald-400">{productData.name}</span>
            <span className="text-white text-[10px]">+1 added (Qty: {newQty})</span>
          </div>
        );

        if (ex) {
          return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
        }
        return [...prev, { ...product, qty: 1, disc: 0 }];
      });
      
      // Optionally also show a subtle UI toast
      showToast(`✓ Scanned: ${productData.name}`);
    } catch (error) {
      setScanFeedback(
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-rose-400">API Error</span>
          <span className="text-slate-300 text-[10px]">Unable to fetch product. Please try again.</span>
        </div>
      );
    }
  }, [showToast]);

  const handleAddProductClick = useCallback(() => {
    searchRef.current?.focus();
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [successBill, setSuccessBill] = useState(null);

  const handleGenerateBill = async () => {
    if (items.length === 0) { showToast("Add at least one product to generate a bill.", "error"); return; }
    if (!PAYMENT_METHODS.some((method) => method.key === paymentMethod)) {
      showToast("Select a payment method before generating the bill.", "error");
      return;
    }
    
    setPhoneTouched(true);
    setNameTouched(true);
    const name = (selectedCustomer?.name || customerName).trim().replace(/\s+/g, " ");
    const phone = customerPhone.replace(/\D/g, "").slice(0, 10);
    
    const paidAmount = receivedAmount === "" ? grandTotal : Number(receivedAmount);
    
    // Credit logic
    if (paidAmount < grandTotal) {
      if (!name || !phone) {
        showToast("Customer name and phone number are required for credit/Kadan.", "error");
        return;
      }
      if (phoneInputInvalid || !/^\d{10}$/.test(phone)) {
        showToast("Valid 10 digit Indian phone number is required for credit.", "error");
        return;
      }
    } else if (phone && !/^\d{10}$/.test(phone)) {
      showToast("Phone number must contain exactly 10 digits.", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await billingApi.createBill({
        customer_name: name || null,
        customer_phone: phone || null,
        items: items.map((item) => ({ variant_id: item.variantId, quantity: item.qty })),
        paid_amount: paidAmount,
        payment_method: paymentMethod.toUpperCase(),
      });
      const data = result?.data || result;
      setSuccessBill({
        bill_number: data.bill_number || data.bill_id || data.id,
        total: grandTotal,
        paid_amount: paidAmount,
        credit: paidAmount < grandTotal ? grandTotal - paidAmount : 0,
        payment_method: paymentMethod.toUpperCase(),
        customer_name: name || (paidAmount >= grandTotal ? "Walk-in Customer" : ""),
        customer_phone: phone,
        items: items
      });
    } catch (error) {
      showToast(error?.message || "Could not save the bill.", "error");
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
    setPaymentMethod("");
    setSelectedCustomer(null);
    setProductSearch("");
    setCustomerMatches([]);
    setCustomerLookup("idle");
    setCustomerLoading(false);
    setLookupRetry(0);
    setCustomerName("");
    setCustomerPhone("");
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
    const handleWhatsApp = () => {
      let text = 'CRYVEX SHOPFLOW\n--------------------\nBill No: ' + successBill.bill_number + '\n\n';
      successBill.items.forEach(item => {
        text += item.name + ' x ' + item.qty + '     ₹' + (item.price * item.qty) + '\n';
      });
      text += '\nTotal: ₹' + successBill.total;
      text += '\nPaid: ₹' + successBill.paid_amount;
      text += '\nBalance: ₹' + successBill.credit + '\n\nThank you for shopping!';
      const phone = successBill.customer_phone ? (successBill.customer_phone.startsWith('91') ? successBill.customer_phone : '91' + successBill.customer_phone) : '';
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank');
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
        
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8 space-y-4">
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Customer</span>
            <span className="font-bold text-slate-900">{successBill.customer_name || 'Walk-in Customer'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Total Amount</span>
            <span className="font-bold text-slate-900">₹{formatINR(successBill.total)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Paid Amount</span>
            <span className="font-bold text-emerald-600">₹{formatINR(successBill.paid_amount)}</span>
          </div>
          {successBill.credit > 0 && (
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">Credit (Kadan)</span>
              <span className="font-bold text-rose-600">₹{formatINR(successBill.credit)}</span>
            </div>
          )}
          <div className="flex justify-between pb-1">
            <span className="text-slate-500">Payment Method</span>
            <span className="font-bold text-slate-900">{successBill.payment_method}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button onClick={handleWhatsApp} className="px-6 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Send Receipt on WhatsApp
          </button>
          <button onClick={() => { setSuccessBill(null); resetForm(); }} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors">
            New Bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Barcode Scanner Modal ── */}
      {showScanner && (
        <BarcodeScanner
          products={catalogue}
          onFound={handleBarcodeFound}
          scanFeedback={scanFeedback}
          onClose={() => {
            setShowScanner(false);
            setScanFeedback(null);
          }}
        />
      )}

      {/* ── Toast ── */}
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

      {/* ── Main page wrapper ── */}
      <div className="space-y-4 max-w-5xl mx-auto relative pb-10">
        {/* ── Page Header ── */}
        <div className="pt-1 pb-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quick Bill Workspace
          </h1>
          {catalogLoading && <p className="mt-1 text-xs text-slate-400">Loading products from server...</p>}
          {catalogError && <p className="mt-1 text-xs text-rose-600" role="alert">Products: {catalogError}</p>}
        </div>

        {/* ── Product Search ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 relative">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                ref={searchRef}
                id="qb-product-search"
                type="text"
                placeholder="Search product by name, SKU, or barcode (F2)..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowProductDrop(true); }}
                onFocus={() => setShowProductDrop(true)}
                onBlur={() => setTimeout(() => setShowProductDrop(false), 180)}
                className="w-full pl-9 pr-20 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <div className="absolute inset-y-0 right-2 flex items-center gap-1 pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-500 font-mono">F2</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-500 font-mono">↵</kbd>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0V8a4 4 0 00-4-4H8a4 4 0 00-4 4v12a4 4 0 004 4h8a4 4 0 004-4v-4" /></svg>
              Scan Barcode
            </button>
          </div>

          {/* Product dropdown */}
          {showProductDrop && filteredProducts.length > 0 && (
            <div className="absolute left-4 right-4 top-[calc(100%-8px)] z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              {filteredProducts.map((p) => (
                <button key={p.id} type="button" onMouseDown={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left transition-colors border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.category}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-700">₹{formatINR(p.price)}</span>
                </button>
              ))}
              <p className="text-[10px] text-slate-400 text-center py-2 border-t border-slate-100">
                Shortcuts: F2 Search &bull; Enter to Add
              </p>
            </div>
          )}
        </div>

        {/* ── Two-column layout: left = items table, right = side panel ── */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">

          {/* ── LEFT: Bill Items Table ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-6">#</th>
                  <th className="py-3 px-3">Product Description</th>
                  <th className="py-3 px-3 text-center">QTY</th>
                  <th className="py-3 px-3 text-right">Price (₹)</th>
                  <th className="py-3 px-3 text-right">Disc. (₹)</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-3 text-right">Total (₹)</th>
                  <th className="py-3 px-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-medium">Search products above to add them to the bill.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const base = item.price * item.qty - item.disc;
                    const lineTotal = base + (base * item.gst) / 100;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.category}</p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" onClick={() => updateQty(item.id, -1)}
                              className="w-6 h-6 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-sm">−</button>
                            <span className="w-7 text-center font-bold text-slate-800">{item.qty}</span>
                            <button type="button" onClick={() => updateQty(item.id, 1)}
                              className="w-6 h-6 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-sm">+</button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">{formatINR(item.price)}</td>
                        <td className="py-3 px-3 text-right">
                          <input type="number" min="0" value={item.disc}
                            onChange={(e) => updateDisc(item.id, e.target.value)}
                            className="w-16 text-right text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-500" />
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">{item.gst}%</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(Math.max(0, lineTotal))}</td>
                        <td className="py-3 px-3 text-right">
                          <button type="button" onClick={() => removeItem(item.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer" title="Remove">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddProductClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 text-blue-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="text-base font-bold leading-none">+</span> Add Product
            </button>
            <span className="text-xs text-slate-400">
              Shortcuts: F2 Search &bull; Enter to Add
            </span>
          </div>

          <div className="py-8 text-center text-xs text-slate-400 border-t border-slate-50">
            Search products above to add them to the bill.
          </div>

          </div>{/* end LEFT col */}

          {/* ── RIGHT: side panel ── */}
          <div className="w-full lg:w-[340px] shrink-0 space-y-4">

            {/* ── Customer Details Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900">Customer Details</h3>
            <button
              type="button"
              onClick={() => setShowCustomer(!showCustomer)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showCustomer ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showCustomer ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {showCustomer && (
            <div className="space-y-2.5">
              {selectedCustomer && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-emerald-700">Existing customer found</p>
                      <p className="text-sm font-bold text-slate-900">{selectedCustomer.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{customerPhone}</p>
                      {selectedCustomer.email && <p className="text-xs text-slate-500 mt-1">{selectedCustomer.email}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">Customer ID: {selectedCustomer.id}</p>
                    </div>
                    <span className="text-[9px] font-bold text-blue-700 border border-blue-200 bg-blue-50 px-1.5 py-1 rounded tracking-wide shrink-0">
                      {selectedCustomer.type?.toUpperCase() || "CUSTOMER"}
                    </span>
                  </div>
                  {selectedCustomer.kadanBalance !== null && selectedCustomer.kadanBalance !== undefined && (
                    <p className="text-xs text-slate-600">Kadan Balance: <span className="font-semibold text-slate-900">₹{formatINR(selectedCustomer.kadanBalance)}</span></p>
                  )}
                  <button type="button" onClick={changeCustomer} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                    Change Customer
                  </button>
                </div>
              )}

              {!selectedCustomer && (
                <>
                  <label className="block text-[11px] font-medium text-slate-600">
                    Phone Number{paymentMethod === "kadan" && <span className="text-rose-600"> *</span>}
                    <input
                      ref={customerPhoneRef}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={10}
                      placeholder="Enter 10-digit phone number"
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      onBlur={() => setPhoneTouched(true)}
                      aria-invalid={Boolean(phoneValidationError)}
                      className={`mt-1 w-full px-3 py-2 text-xs bg-slate-50/70 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 ${phoneValidationError ? "border-rose-400" : "border-slate-200"}`}
                    />
                    {phoneValidationError && <span className="mt-1 block text-[10px] text-rose-600" role="alert">{phoneValidationError}</span>}
                  </label>

                  {customerLoading && <p className="text-[10px] text-slate-500" role="status">Searching existing customers...</p>}
                  {customerLookup === "notFound" && <p className="text-[10px] text-slate-500" role="status">No existing customer found. Enter a name to continue.</p>}
                  {customerLookup === "error" && (
                    <p className="text-[10px] text-rose-600" role="alert">
                      Unable to search customers. <button type="button" className="font-semibold underline" onClick={() => setLookupRetry((attempt) => attempt + 1)}>Retry</button>
                    </p>
                  )}
                  {customerLookup === "multiple" && (
                    <div className="overflow-hidden rounded-xl border border-slate-200" role="listbox" aria-label="Matching customers">
                      <p className="px-3 py-2 text-[10px] font-semibold text-slate-500">Multiple customers found. Select the correct customer.</p>
                      {customerMatches.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 text-left hover:bg-blue-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-800">{customer.name}</span>
                            <span className="block text-[10px] text-slate-500">{customer.phone}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">{customer.type}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5">
                    <label className="block text-[11px] font-medium text-slate-600">
                      Customer Name{paymentMethod === "kadan" && <span className="text-rose-600"> *</span>}
                      <input
                        type="text"
                        placeholder="Enter customer name"
                        value={customerName}
                        onChange={handleCustomerNameChange}
                        onBlur={() => {
                          setNameTouched(true);
                          setCustomerName((name) => name.trim().replace(/\s+/g, " "));
                        }}
                        aria-invalid={Boolean(nameValidationError)}
                        className={`mt-1 w-full px-3 py-2 text-xs bg-slate-50/70 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 ${nameValidationError ? "border-rose-400" : "border-slate-200"}`}
                      />
                      {nameValidationError && <span className="mt-1 block text-[10px] text-rose-600" role="alert">{nameValidationError}</span>}
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
            </div>{/* end Customer Details Card */}

            {/* ── Bill Summary & Payment Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="h-1 bg-slate-800 w-full" />
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Subtotal ({items.length} items)</span>
              <span className="font-bold text-slate-900">₹ {formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Discount</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType((t) => t === "amount" ? "percent" : "amount")}
                  className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 text-[10px] font-bold text-slate-600 transition-colors"
                  title="Toggle ₹ / %"
                >
                  {discountType === "amount" ? "- ₹" : "- %"}
                </button>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-20 text-right text-xs font-bold text-blue-600 border-b border-dashed border-blue-300 focus:outline-none bg-transparent"
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>GST</span>
              <span className="font-semibold text-slate-700">+ ₹ {formatINR(gstAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Received Amount</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                    value={paymentMethod === "kadan" ? "0" : receivedAmount}
                    disabled={paymentMethod === "kadan"}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-24 text-right text-xs text-slate-700 border-b border-dashed border-slate-300 focus:outline-none focus:border-blue-400 bg-transparent"
                />
              </div>
            </div>
            {(received > 0 || paymentMethod === "kadan") && (
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Balance</span>
                <span className={`font-bold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {balance >= 0 ? `₹ ${formatINR(balance)}` : `-₹ ${formatINR(Math.abs(balance))}`}
                </span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">Grand Total</span>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                ₹{formatINR(grandTotal).replace(/\.00$/, "")}
              </span>
            </div>

            {/* ── Payment Card with smooth bottom-to-top slide/swipe animation ── */}
            {paymentVisible && (
              <div
                className="pt-4 border-t border-slate-100 space-y-3.5"
                style={{
                  transform: paymentSettled ? "translateY(0)" : "translateY(36px)",
                  opacity: paymentSettled ? 1 : 0,
                  transition: "transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 420ms ease-out",
                }}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  PAYMENT METHOD
                </p>

                {/* 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3">
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
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/40 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                        <div className={`mb-1.5 ${isSelected ? "text-blue-600" : "text-slate-500"}`}>
                          {pm.icon}
                        </div>
                        <span className={`text-xs font-semibold ${isSelected ? "text-blue-950 font-bold" : "text-slate-700"}`}>
                          {pm.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* + Add Product */}
                <button
                  type="button"
                  onClick={handleAddProductClick}
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[10px] font-bold text-blue-600 leading-none">
                    +
                  </span>
                  Add Product
                </button>

                {/* Generate Bill */}
                <button
                  type="button"
                  onClick={handleGenerateBill}
                  disabled={isSubmitting || items.length === 0}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isSubmitting ? "Saving bill..." : "Generate Bill"}
                </button>

                {/* Cancel */}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-500 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
            </div>{/* end Bill Summary & Payment Card */}

          </div>{/* end RIGHT panel */}
        </div>{/* end two-column layout */}

      </div>
    </>
  );
}
