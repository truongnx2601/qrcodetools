
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./App.css";

const PREVIEW_SIZE = 280;
const EXPORT_SIZE = 2048;
const DEFAULT_LOGO_PERCENT = 20;
const MIN_LOGO_PERCENT = 10;
const MAX_LOGO_PERCENT = 25;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  // Nếu người dùng nhập example.com, tự thêm https://
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname.includes(".") ||
      parsed.hostname.startsWith(".") ||
      parsed.hostname.endsWith(".")
    ) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

function App() {
  const [urlInput, setUrlInput] = useState("https://example.com");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoPercent, setLogoPercent] = useState(
    DEFAULT_LOGO_PERCENT
  );
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportCanvasRef = useRef<HTMLDivElement>(null);

  const normalizedUrl = normalizeUrl(urlInput);
  const isUrlValid = normalizedUrl !== null;

  // Thu hồi object URL cũ để tránh giữ bộ nhớ không cần thiết.
  useEffect(() => {
    return () => {
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl);
      }
    };
  }, [logoUrl]);

  function handleLogoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    // Cho phép chọn lại cùng một file sau khi thay đổi.
    event.target.value = "";

    if (!file) return;

    const supportedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!supportedTypes.includes(file.type)) {
      setError("Vui lòng chọn ảnh PNG, JPG hoặc WebP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Logo phải có dung lượng tối đa 5 MB.");
      return;
    }

    const newLogoUrl = URL.createObjectURL(file);

    // Chỉ nhận file nếu trình duyệt đọc được ảnh.
    const image = new Image();

    image.onload = () => {
      setLogoUrl(newLogoUrl);
      setLogoName(file.name);
      setError("");
    };

    image.onerror = () => {
      URL.revokeObjectURL(newLogoUrl);
      setError("Không thể đọc ảnh này. Vui lòng thử file khác.");
    };

    image.src = newLogoUrl;
  }

  function removeLogo() {
    setLogoUrl(null);
    setLogoName("");
    setError("");
  }

  async function downloadPng() {
    if (!normalizedUrl) {
      setError("Vui lòng nhập một URL hợp lệ.");
      return;
    }

    const exportCanvas =
      exportCanvasRef.current?.querySelector("canvas");

    if (!exportCanvas) {
      setError("QR chưa sẵn sàng. Vui lòng thử lại.");
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      // Chuyển canvas thành PNG và tải xuống.
      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Không thể tạo file PNG."));
          }
        }, "image/png");
      });

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = "qrcode-2048.png";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      // Đợi trình duyệt bắt đầu tải file trước khi thu hồi URL.
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      setError("Xuất PNG thất bại. Vui lòng thử lại.");
    } finally {
      setIsDownloading(false);
    }
  }

  const previewLogoSize = PREVIEW_SIZE * (logoPercent / 100);
  const exportLogoSize = EXPORT_SIZE * (logoPercent / 100);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-icon">QR</span>
          <span>QR Studio</span>
        </a>

        <span className="topbar-label">
          FREE QR CODE GENERATOR
        </span>
      </header>

      <section className="hero">
        <span className="eyebrow">SIMPLE · PRIVATE · FREE</span>
        <h1>
          Tạo mã QR của riêng bạn<span>.</span>
        </h1>
        <p>
          Biến đường dẫn thành mã QR, thêm logo thương hiệu
          và tải ảnh PNG chất lượng cao chỉ trong vài giây.
        </p>
      </section>

      <section className="workspace">
        <div className="editor-panel">
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2>Nội dung QR</h2>
              <p>Nhập đường dẫn bạn muốn chia sẻ.</p>
            </div>
          </div>

          <label className="field-label" htmlFor="url-input">
            Đường dẫn URL
          </label>

          <div className="url-field">
            <span className="url-icon">↗</span>
            <input
              id="url-input"
              type="text"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://example.com"
              autoComplete="url"
              spellCheck={false}
            />
            {isUrlValid && <span className="valid-icon">✓</span>}
          </div>

          {urlInput.trim() && !isUrlValid && (
            <p className="field-error">
              URL không hợp lệ. Hãy nhập địa chỉ HTTP hoặc HTTPS.
            </p>
          )}

          <div className="section-divider" />

          <div className="section-heading">
            <span className="step-number">02</span>
            <div>
              <h2>Logo thương hiệu</h2>
              <p>Thêm hình ảnh vào chính giữa mã QR.</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoChange}
          />

          {logoUrl ? (
            <div className="logo-file-card">
              <img
                className="logo-thumbnail"
                src={logoUrl}
                alt="Logo đã chọn"
              />

              <div className="logo-file-info">
                <strong>{logoName}</strong>
                <span>Logo đã sẵn sàng</span>
              </div>

              <button
                className="remove-button"
                type="button"
                onClick={removeLogo}
                aria-label="Xóa logo"
                title="Xóa logo"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              className="upload-zone"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="upload-icon">↑</span>
              <strong>Chọn ảnh logo</strong>
              <span>Kéo thả chưa bật — nhấn để chọn file</span>
              <span className="upload-formats">
                PNG · JPG · WEBP · Tối đa 5 MB
              </span>
            </button>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {logoUrl ? "Thay đổi logo" : "Chọn logo từ máy tính"}
          </button>

          <div className="section-divider" />

          <div className="slider-heading">
            <label className="field-label" htmlFor="logo-size">
              Kích thước logo
            </label>
            <span className="slider-value">{logoPercent}%</span>
          </div>

          <input
            id="logo-size"
            className="logo-slider"
            type="range"
            min={MIN_LOGO_PERCENT}
            max={MAX_LOGO_PERCENT}
            step={1}
            value={logoPercent}
            onChange={(event) =>
              setLogoPercent(Number(event.target.value))
            }
            disabled={!logoUrl}
          />

          <div className="slider-labels">
            <span>Nhỏ hơn · 10%</span>
            <span>Lớn hơn · 25%</span>
          </div>

          <div className="settings-summary">
            <div>
              <span className="settings-dot" />
              <span>Màu QR</span>
              <strong>Đen</strong>
            </div>
            <div>
              <span className="settings-dot white-dot" />
              <span>Nền</span>
              <strong>Trắng</strong>
            </div>
            <div>
              <span className="settings-dot" />
              <span>Xuất ảnh</span>
              <strong>2048 px</strong>
            </div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}

          <button
            className="download-button"
            type="button"
            onClick={downloadPng}
            disabled={!isUrlValid || isDownloading}
          >
            <span>{isDownloading ? "Đang tạo PNG..." : "↓"}</span>
            {isDownloading
              ? "Đang xuất ảnh..."
              : "Tải xuống PNG · 2048 × 2048"}
          </button>

          <p className="privacy-note">
            🔒 URL và logo được xử lý ngay trên trình duyệt.
          </p>
        </div>

        <aside className="preview-panel">
          <div className="preview-header">
            <div>
              <span className="preview-overline">LIVE PREVIEW</span>
              <h2>Xem trước mã QR</h2>
            </div>
            <span className="live-badge">
              <span /> LIVE
            </span>
          </div>

          <div className="qr-stage">
            {isUrlValid ? (
              <div className="qr-preview">
                <QRCodeCanvas
                  value={normalizedUrl}
                  size={PREVIEW_SIZE}
                  level="H"
                  marginSize={4}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  imageSettings={
                    logoUrl
                      ? {
                          src: logoUrl,
                          width: previewLogoSize,
                          height: previewLogoSize,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="preview-placeholder">
                <span>▦</span>
                <p>Nhập URL hợp lệ để tạo mã QR.</p>
              </div>
            )}
          </div>

          <div className="preview-url">
            <span className="preview-link-icon">↗</span>
            <span title={normalizedUrl ?? ""}>
              {normalizedUrl ?? "Chưa có URL hợp lệ"}
            </span>
          </div>

          <div className="preview-stats">
            <div>
              <span>KÍCH THƯỚC XUẤT</span>
              <strong>2048 × 2048 px</strong>
            </div>
            <div>
              <span>LOGO</span>
              <strong>{logoUrl ? `${logoPercent}%` : "Chưa thêm"}</strong>
            </div>
            <div>
              <span>ĐỊNH DẠNG</span>
              <strong>PNG · Nền trắng</strong>
            </div>
          </div>

          <div className="scan-tip">
            <span className="scan-tip-icon">✓</span>
            <div>
              <strong>Mẹo để QR dễ quét</strong>
              <p>
                Giữ logo ở mức vừa phải, duy trì nền trắng và
                kiểm tra bằng điện thoại trước khi in.
              </p>
            </div>
          </div>
        </aside>
      </section>

      {/* Canvas độ phân giải cao, chỉ dùng để xuất file. */}
      <div
        ref={exportCanvasRef}
        className="export-canvas"
        aria-hidden="true"
      >
        {isUrlValid && (
          <QRCodeCanvas
            value={normalizedUrl}
            size={EXPORT_SIZE}
            level="H"
            marginSize={4}
            bgColor="#FFFFFF"
            fgColor="#000000"
            imageSettings={
              logoUrl
                ? {
                    src: logoUrl,
                    width: exportLogoSize,
                    height: exportLogoSize,
                    excavate: true,
                  }
                : undefined
            }
          />
        )}
      </div>

      <footer className="app-footer">
        <span>QR STUDIO</span>
        <span>Đơn giản · Riêng tư · Miễn phí</span>
      </footer>
    </main>
  );
}

export default App;
