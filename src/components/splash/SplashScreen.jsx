import cryvexLogo from "../../assets/cryvex-logo.png";

/**
 * Initial Splash / Startup Loading Screen for Cryvex ShopFlow
 * Features:
 * - Transparent PNG Cryvex logo centered vertically and horizontally
 * - "Welcome to Cryvex ShopFlow" displayed below the logo in black
 * - Three small blue dots with sequential one-by-one blinking animation
 * - Responsive on mobile and desktop
 * - Clear connection error message and retry button if API is unavailable
 */
export default function SplashScreen({
  status = "loading", // "loading" | "error"
  errorMessage = "",
  onRetry,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-4 select-none min-h-screen w-full"
      role="region"
      aria-label="Cryvex ShopFlow Startup"
    >
      <div className="flex flex-col items-center justify-center text-center max-w-sm w-full mx-auto">
        {/* Transparent PNG Cryvex Logo */}
        <div className="flex items-center justify-center mb-6">
          <img
            src={cryvexLogo}
            alt="Cryvex ShopFlow Logo"
            className="w-28 sm:w-36 md:w-40 h-auto object-contain transition-transform duration-300"
          />
        </div>

        {/* Welcome Text in Black */}
        <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight text-center mb-5">
          Welcome to Cryvex ShopFlow
        </h1>

        {/* Loading State: Three small blue dots with sequential one-by-one blinking */}
        {status === "loading" && (
          <div
            className="flex items-center justify-center gap-2.5 py-2"
            role="status"
            aria-label="Loading..."
          >
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600 inline-block animate-splash-dot-1"
              style={{
                animation: "splashDotPulse 1.2s infinite ease-in-out",
                animationDelay: "0s",
              }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600 inline-block animate-splash-dot-2"
              style={{
                animation: "splashDotPulse 1.2s infinite ease-in-out",
                animationDelay: "0.2s",
              }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600 inline-block animate-splash-dot-3"
              style={{
                animation: "splashDotPulse 1.2s infinite ease-in-out",
                animationDelay: "0.4s",
              }}
            />
          </div>
        )}

        {/* Connection Unavailable State & Retry Option */}
        {status === "error" && (
          <div className="w-full flex flex-col items-center mt-2 animate-fadeIn">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 w-full shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 font-semibold text-red-800 mb-1">
                <svg
                  className="w-4 h-4 text-red-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Server Unavailable</span>
              </div>
              <p className="text-xs text-red-600 leading-relaxed">
                {errorMessage ||
                  "Unable to establish connection to Cryvex services. Please check your internet or retry."}
              </p>
            </div>

            <button
              onClick={onRetry}
              type="button"
              className="btn-primary px-6 py-2.5 text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
