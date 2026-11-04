"use client";

import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";

export default function AccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="auth-main">
        <section className="auth-card account-card">
          <span className="section-kicker">BREWLITE MEMBER</span>
          <h1>Tài khoản</h1>
          {user ? (
            <>
              <p className="auth-intro">Thông tin phiên đăng nhập hiện tại của bạn.</p>
              <dl className="account-details">
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Điểm thành viên</dt>
                  <dd>{user.loyaltyPoints}</dd>
                </div>
              </dl>
              <p className="account-note">
                Điểm thành viên hiện mới là thông tin hồ sơ; chương trình tích điểm chưa được triển khai.
                Phiên đăng nhập được giữ trong bộ nhớ và sẽ kết thúc khi tải lại trang.
              </p>
              <div className="account-actions">
                <Link className="detail-action" href="/orders">Lịch sử đơn hàng</Link>
                <Link className="detail-action" href="/#menu">Tiếp tục chọn món</Link>
                <button className="account-logout" onClick={logout} type="button">Đăng xuất</button>
              </div>
            </>
          ) : (
            <div className="account-signed-out">
              <p className="auth-intro">
                Bạn chưa đăng nhập hoặc phiên đã kết thúc. Giỏ hàng vẫn được lưu trên thiết bị này.
              </p>
              <Link className="detail-action auth-submit" href="/login?returnTo=%2Faccount">
                Đăng nhập
              </Link>
            </div>
          )}
        </section>
      </main>
      <footer className="footer">
        <div><span className="footer-brand">Brew<span>Lite</span></span><p>Một chút cà phê, một ngày nhiều cảm hứng.</p></div>
        <div className="footer-right"><span>Đồ án học phần Công nghệ phần mềm · Trường Đại học Sài Gòn</span><small>© {new Date().getFullYear()} BrewLite</small></div>
      </footer>
    </div>
  );
}
